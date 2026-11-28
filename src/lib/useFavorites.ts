import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getToySdk,
  isToyAbilitySupported,
  isToyRateLimitError,
  readToyCloudValue,
  removeToyCloudValue,
  writeToyCloudValue,
} from './toySdk';

const MAX_VALUE_BYTES = 980; // Safely below Toy cloud storage 1024-byte value cap
const FLUSH_DEBOUNCE_MS = 1200;
const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 30000;
const MAX_RATE_LIMIT_RETRIES = 4;

export type FavoriteSyncMode = 'local' | 'cloud';

function localKey(seasonId: string): string {
  return `wxq_fav_${seasonId}`;
}

function cloudKey(seasonId: string): string {
  const safe = seasonId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
  return `fav_${safe || 's1'}`;
}

export function utf8ByteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).byteLength;
  }
  return value.length;
}

export function parseFavoritePayload(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const entry of parsed) {
      if (typeof entry === 'string' && entry.length > 0 && !seen.has(entry)) {
        seen.add(entry);
        list.push(entry);
      }
    }
    return list;
  } catch {
    return [];
  }
}

export function serializeFavoritePayload(ids: string[]): string | null {
  const payload = JSON.stringify(ids);
  if (utf8ByteLength(payload) > MAX_VALUE_BYTES) return null;
  return payload;
}

function readLocalFavorites(seasonId: string): string[] {
  try {
    return parseFavoritePayload(window.localStorage.getItem(localKey(seasonId)));
  } catch {
    return [];
  }
}

function writeLocalFavorites(seasonId: string, ids: string[]) {
  try {
    const serialized = JSON.stringify(ids);
    window.localStorage.setItem(localKey(seasonId), serialized);
  } catch {
    // Ignore private-mode / storage quota failures
  }
}

/**
 * Season-scoped favorites stored in memory + localStorage with debounced,
 * checkpoint-flushed Bilibili Toy Cloud Storage synchronization.
 *
 * Follows Toy SDK rate-limit best practices:
 * - Single read on mount (no polling)
 * - Batched single-key JSON payload (<= 980 bytes)
 * - Debounced writes + flush on page hide / Toy onPageClose
 * - Exponential backoff on 307044 rate-limit errors (never immediate retry)
 */
export function useFavorites(seasonId: string) {
  const [ids, setIds] = useState<string[]>(() => readLocalFavorites(seasonId));
  const [syncMode, setSyncMode] = useState<FavoriteSyncMode>('local');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const idsRef = useRef<string[]>(ids);
  const dirtyRef = useRef(false);
  const cloudReadyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);
  const flushingRef = useRef(false);

  idsRef.current = ids;

  const clearScheduledFlush = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flushToCloud = useCallback(async () => {
    if (!dirtyRef.current || !cloudReadyRef.current || flushingRef.current) return;

    const currentIds = idsRef.current;
    const key = cloudKey(seasonId);
    const serialized = serializeFavoritePayload(currentIds);
    if (currentIds.length > 0 && serialized === null) {
      dirtyRef.current = false;
      setSyncNotice('收藏条目接近云存储容量上限，已优先保存在本地');
      return;
    }

    flushingRef.current = true;
    try {
      if (currentIds.length === 0) {
        await removeToyCloudValue(key);
      } else if (serialized !== null) {
        await writeToyCloudValue(key, serialized);
      }
      dirtyRef.current = false;
      retryAttemptRef.current = 0;
      setSyncMode('cloud');
      setSyncNotice(null);
    } catch (error: unknown) {
      if (isToyRateLimitError(error)) {
        const attempt = retryAttemptRef.current;
        if (attempt < MAX_RATE_LIMIT_RETRIES) {
          retryAttemptRef.current = attempt + 1;
          const delayMs = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt);
          setSyncNotice('云同步请求过于频繁，已保存在本地并将稍后自动重试');
          clearScheduledFlush();
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            void flushToCloud();
          }, delayMs);
        } else {
          setSyncNotice('云同步当前繁忙，收藏已保存在本地');
        }
      } else {
        // Not logged in or unsupported: remain cleanly in local storage mode
        cloudReadyRef.current = false;
        setSyncMode('local');
      }
    } finally {
      flushingRef.current = false;
    }
  }, [seasonId, clearScheduledFlush]);

  const scheduleFlush = useCallback(() => {
    clearScheduledFlush();
    if (!cloudReadyRef.current) return;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flushToCloud();
    }, FLUSH_DEBOUNCE_MS);
  }, [clearScheduledFlush, flushToCloud]);

  // Load local favorites immediately and perform ONE cloud hydration per season
  useEffect(() => {
    let active = true;
    clearScheduledFlush();
    dirtyRef.current = false;
    retryAttemptRef.current = 0;
    cloudReadyRef.current = false;
    setSyncNotice(null);

    const localIds = readLocalFavorites(seasonId);
    setIds(localIds);
    idsRef.current = localIds;

    const hydrateFromCloud = async () => {
      const canRead = await isToyAbilitySupported('getCloudStorage');
      const canWrite = await isToyAbilitySupported('setCloudStorage');
      if (!active || !canRead || !canWrite) {
        setSyncMode('local');
        return;
      }

      try {
        const raw = await readToyCloudValue(cloudKey(seasonId));
        if (!active) return;
        cloudReadyRef.current = true;
        setSyncMode('cloud');

        const cloudIds = parseFavoritePayload(raw);
        if (cloudIds.length > 0 && !dirtyRef.current) {
          const merged = [...new Set([...cloudIds, ...idsRef.current])];
          const fits = serializeFavoritePayload(merged) !== null ? merged : cloudIds;
          idsRef.current = fits;
          setIds(fits);
          writeLocalFavorites(seasonId, fits);
          if (fits.length > cloudIds.length) {
            dirtyRef.current = true;
            scheduleFlush();
          }
        } else if (cloudIds.length === 0 && idsRef.current.length > 0 && !dirtyRef.current) {
          dirtyRef.current = true;
          scheduleFlush();
        }
      } catch (error: unknown) {
        if (!active) return;
        if (isToyRateLimitError(error)) {
          setSyncNotice('云收藏加载繁忙，当前展示本地收藏');
        }
        cloudReadyRef.current = false;
        setSyncMode('local');
      }
    };

    void hydrateFromCloud();

    return () => {
      active = false;
      clearScheduledFlush();
    };
  }, [seasonId, clearScheduledFlush, scheduleFlush]);

  // Flush dirty state at lifecycle checkpoints (page hide / Toy onPageClose)
  useEffect(() => {
    const flushIfDirty = () => {
      if (dirtyRef.current && retryAttemptRef.current === 0) {
        clearScheduledFlush();
        void flushToCloud();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushIfDirty();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushIfDirty);

    let offPageClose: (() => void) | null = null;
    const sdk = getToySdk();
    if (sdk && typeof sdk.onPageClose === 'function') {
      void isToyAbilitySupported('onPageClose').then((supported) => {
        if (supported) {
          try {
            offPageClose = sdk.onPageClose(flushIfDirty);
          } catch {
            offPageClose = null;
          }
        }
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushIfDirty);
      offPageClose?.();
    };
  }, [clearScheduledFlush, flushToCloud]);

  const favoriteIds = useMemo(() => new Set(ids), [ids]);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  const toggleFavorite = useCallback(
    (id: string) => {
      const current = idsRef.current;
      const exists = current.includes(id);
      const next = exists ? current.filter((entry) => entry !== id) : [...current, id];

      if (!exists && serializeFavoritePayload(next) === null) {
        setSyncNotice('当前赛季收藏数量已达云同步容量上限，请先取消部分旧收藏');
        return false;
      }

      idsRef.current = next;
      setIds(next);
      writeLocalFavorites(seasonId, next);
      setSyncNotice(null);

      if (cloudReadyRef.current) {
        dirtyRef.current = true;
        retryAttemptRef.current = 0;
        scheduleFlush();
      }
      return !exists;
    },
    [seasonId, scheduleFlush],
  );

  const clearSyncNotice = useCallback(() => setSyncNotice(null), []);

  return {
    favoriteIds,
    favoriteCount: ids.length,
    isFavorite,
    toggleFavorite,
    syncMode,
    syncNotice,
    clearSyncNotice,
  };
}
