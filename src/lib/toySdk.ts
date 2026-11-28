export interface ToySafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ToyContainerState {
  deviceType: 'phone' | 'tablet' | 'desktop' | 'unknown';
  viewport: { width: number; height: number };
  safeArea: ToySafeArea;
  orientation: 'portrait' | 'landscape';
  immersive: boolean;
  changedFields: string[];
}

export interface ToyQrCodeResult {
  base64: string;
  url: string;
}

export interface ToySdkError {
  type?: string;
  code?: number | string;
  message?: string;
}

export interface ToyGlobal {
  isSupport(ability: string): Promise<boolean>;
  share(req: { path: string }): Promise<void>;
  getQrCode(req?: { path?: string; size?: number }): Promise<ToyQrCodeResult>;
  saveImageToAlbum(req: {
    url?: string;
    base64Data?: string;
    hintMsg?: string;
  }): Promise<{ localPath: string }>;
  getCloudStorage(keys?: string[]): Promise<Record<string, string>>;
  setCloudStorage(items: Record<string, string>): Promise<void>;
  removeCloudStorage(keys: string[]): Promise<void>;
  getContainerState(): Promise<ToyContainerState>;
  onContainerChange(listener: (state: ToyContainerState) => void): () => void;
  onPageClose(listener: () => void): () => void;
}

declare global {
  interface Window {
    toy?: ToyGlobal;
  }
}

export const TOY_RATE_LIMIT_CODE = 307044;

export function getToySdk(): ToyGlobal | null {
  if (typeof window === 'undefined') return null;
  const sdk = window.toy;
  if (!sdk || typeof sdk.isSupport !== 'function') return null;
  return sdk;
}

export async function isToyAbilitySupported(ability: string): Promise<boolean> {
  const sdk = getToySdk();
  if (!sdk) return false;
  try {
    return Boolean(await sdk.isSupport(ability));
  } catch {
    return false;
  }
}

export function isToyRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as ToySdkError;
  return record.type === 'http_error' && Number(record.code) === TOY_RATE_LIMIT_CODE;
}

export function isSafeToyRelativePath(path: string): boolean {
  if (!path) return true;
  if (path.startsWith('/') || path.startsWith('\\')) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return false;
  if (path.includes('..')) return false;
  return true;
}

function applySafeAreaCssVars(safeArea: ToySafeArea) {
  const root = document.documentElement;
  const clampPx = (value: number) => `${Math.max(0, Math.round(Number.isFinite(value) ? value : 0))}px`;
  root.style.setProperty('--toy-safe-top', clampPx(safeArea.top));
  root.style.setProperty('--toy-safe-right', clampPx(safeArea.right));
  root.style.setProperty('--toy-safe-bottom', clampPx(safeArea.bottom));
  root.style.setProperty('--toy-safe-left', clampPx(safeArea.left));
}

/**
 * Adapts layout safe areas and Bilibili App top-right capsule spacing using Toy SDK
 * `getContainerState` + `onContainerChange`. Gracefully no-ops outside Bilibili App.
 */
export function initToyContainerAdaptation(): () => void {
  let disposed = false;
  let unsubscribe: (() => void) | null = null;

  const setup = async () => {
    const sdk = getToySdk();
    if (!sdk) return;

    const [canGet, canListen] = await Promise.all([
      isToyAbilitySupported('getContainerState'),
      isToyAbilitySupported('onContainerChange'),
    ]);
    if (disposed || (!canGet && !canListen)) return;

    document.documentElement.dataset.toyApp = 'true';

    if (canGet) {
      try {
        const state = await sdk.getContainerState();
        if (!disposed && state?.safeArea) {
          applySafeAreaCssVars(state.safeArea);
        }
      } catch {
        // Ignore unsupported / non-App environment errors
      }
    }

    if (canListen && !disposed) {
      try {
        unsubscribe = sdk.onContainerChange((next) => {
          if (!disposed && next?.safeArea) {
            applySafeAreaCssVars(next.safeArea);
          }
        });
      } catch {
        unsubscribe = null;
      }
    }
  };

  void setup();

  return () => {
    disposed = true;
    unsubscribe?.();
    delete document.documentElement.dataset.toyApp;
    document.documentElement.style.removeProperty('--toy-safe-top');
    document.documentElement.style.removeProperty('--toy-safe-right');
    document.documentElement.style.removeProperty('--toy-safe-bottom');
    document.documentElement.style.removeProperty('--toy-safe-left');
  };
}

export async function shareToyPage(path: string): Promise<boolean> {
  if (!isSafeToyRelativePath(path)) return false;
  const sdk = getToySdk();
  if (!sdk || !(await isToyAbilitySupported('share'))) return false;
  await sdk.share({ path });
  return true;
}

export async function getToyQrCode(path: string, size = 320): Promise<ToyQrCodeResult | null> {
  if (!isSafeToyRelativePath(path)) return null;
  const sdk = getToySdk();
  if (!sdk || !(await isToyAbilitySupported('getQrCode'))) return null;
  const clampedSize = Math.min(1024, Math.max(80, Math.round(size)));
  return await sdk.getQrCode({ path, size: clampedSize });
}

export async function saveToyImageToAlbum(
  base64Data: string,
  hintMsg = '需要相册权限以保存万象棋谱二维码',
): Promise<boolean> {
  const sdk = getToySdk();
  if (!sdk || !(await isToyAbilitySupported('saveImageToAlbum'))) return false;
  await sdk.saveImageToAlbum({ base64Data, hintMsg });
  return true;
}

export async function readToyCloudValue(key: string): Promise<string | null> {
  const sdk = getToySdk();
  if (!sdk || !(await isToyAbilitySupported('getCloudStorage'))) return null;
  const record = await sdk.getCloudStorage([key]);
  return typeof record?.[key] === 'string' ? record[key] : null;
}

export async function writeToyCloudValue(key: string, value: string): Promise<boolean> {
  const sdk = getToySdk();
  if (!sdk || !(await isToyAbilitySupported('setCloudStorage'))) return false;
  await sdk.setCloudStorage({ [key]: value });
  return true;
}

export async function removeToyCloudValue(key: string): Promise<boolean> {
  const sdk = getToySdk();
  if (!sdk || !(await isToyAbilitySupported('removeCloudStorage'))) return false;
  await sdk.removeCloudStorage([key]);
  return true;
}
