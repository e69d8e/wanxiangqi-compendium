import type { CatalogItem, Kind, SeasonDataset, SeasonMeta } from '../types';

// Eagerly import only tiny meta.json files (~1 KB each) so initial bundle stays lean
// and preserves season metadata (e.g. currentPatch) in the entry chunk.
const metaModules = import.meta.glob('./seasons/*/meta.json', {
  eager: true,
  import: 'default',
}) as Record<string, SeasonMeta>;

// Lazily import large category JSON payloads per season so multi-season data
// never bloats initial load or loads unselected seasons.
const itemModules = import.meta.glob(
  ['./seasons/*/*.json', '!./seasons/*/meta.json'],
  { import: 'default' },
) as Record<string, () => Promise<unknown>>;

export const seasonMetas: SeasonMeta[] = Object.values(metaModules).toSorted(
  (left, right) => left.order - right.order,
);

if (seasonMetas.length === 0) {
  throw new Error('没有找到任何赛季元数据');
}

export const defaultSeasonMeta: SeasonMeta =
  seasonMetas.find((meta) => meta.isDefault) ??
  seasonMetas.find((meta) => meta.status === 'live') ??
  seasonMetas[0];

export function resolveSeasonMeta(id?: string | null): SeasonMeta {
  return seasonMetas.find((meta) => meta.id === id) ?? defaultSeasonMeta;
}

const datasetCache = new Map<string, Promise<SeasonDataset>>();

async function loadSeasonFile(seasonId: string, filename: string): Promise<CatalogItem[]> {
  const key = `./seasons/${seasonId}/${filename}`;
  const loader = itemModules[key];
  if (!loader) {
    throw new Error(`缺少赛季数据：${key}`);
  }
  const value = await loader();
  if (!Array.isArray(value)) {
    throw new Error(`赛季数据不是数组：${seasonId}/${filename}`);
  }
  return value as CatalogItem[];
}

export function loadSeasonDataset(seasonId?: string | null): Promise<SeasonDataset> {
  const meta = resolveSeasonMeta(seasonId);
  const cached = datasetCache.get(meta.id);
  if (cached) return cached;

  const promise = Promise.all([
    loadSeasonFile(meta.id, 'heroes.json'),
    loadSeasonFile(meta.id, 'players.json'),
    loadSeasonFile(meta.id, 'talents.json'),
    loadSeasonFile(meta.id, 'equipment.json'),
    loadSeasonFile(meta.id, 'effects.json'),
  ]).then(([heroes, players, talents, equipment, effects]) => {
    const dataByKind: Record<Kind, CatalogItem[]> = {
      hero: heroes,
      player: players,
      talent: talents,
      equipment,
      effect: effects,
    };
    const allItems = [
      ...heroes,
      ...players,
      ...talents,
      ...equipment,
      ...effects,
    ];
    return {
      meta,
      heroes,
      players,
      talents,
      equipment,
      effects,
      dataByKind,
      allItems,
      itemById: new Map(allItems.map((item) => [item.id, item])),
    };
  });

  datasetCache.set(meta.id, promise);
  return promise;
}
