import type {
  CatalogItem,
  CatalogMeta,
  Kind,
  SeasonDataset,
  SeasonMeta,
} from '../types';

const modules = import.meta.glob('./seasons/*/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

function readSeasonFile(seasonId: string, filename: string): unknown {
  const key = `./seasons/${seasonId}/${filename}`;
  if (!(key in modules)) {
    throw new Error(`缺少赛季数据：${key}`);
  }
  return modules[key];
}

function readItems(seasonId: string, filename: string): CatalogItem[] {
  const value = readSeasonFile(seasonId, filename);
  if (!Array.isArray(value)) {
    throw new Error(`赛季数据不是数组：${seasonId}/${filename}`);
  }
  return value as CatalogItem[];
}

function readMeta(seasonId: string): SeasonMeta {
  const value = readSeasonFile(seasonId, 'meta.json');
  if (!value || typeof value !== 'object') {
    throw new Error(`赛季 meta 非法：${seasonId}`);
  }
  return value as SeasonMeta;
}

function createSeason(seasonId: string): SeasonDataset {
  const meta = readMeta(seasonId);
  const heroes = readItems(seasonId, 'heroes.json');
  const players = readItems(seasonId, 'players.json');
  const talents = readItems(seasonId, 'talents.json');
  const equipment = readItems(seasonId, 'equipment.json');
  const effects = readItems(seasonId, 'effects.json');
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
}

const seasonIds = [
  ...new Set(
    Object.keys(modules)
      .map((key) => key.match(/^\.\/seasons\/([^/]+)\/meta\.json$/)?.[1])
      .filter((value): value is string => Boolean(value)),
  ),
];

export const seasons: SeasonDataset[] = seasonIds
  .map(createSeason)
  .sort((left, right) => left.meta.order - right.meta.order);

if (seasons.length === 0) throw new Error('没有找到任何赛季数据');

export const defaultSeason =
  seasons.find((season) => season.meta.isDefault) ??
  seasons.find((season) => season.meta.status === 'live') ??
  seasons[0];

export function getSeason(id?: string | null): SeasonDataset {
  return seasons.find((season) => season.meta.id === id) ?? defaultSeason;
}

// Backwards-compatible single-season exports. New code should receive a
// SeasonDataset from App so every page can render the selected season.
export const heroes = defaultSeason.heroes;
export const players = defaultSeason.players;
export const talents = defaultSeason.talents;
export const equipment = defaultSeason.equipment;
export const effects = defaultSeason.effects;
export const meta: CatalogMeta = defaultSeason.meta;
export const dataByKind = defaultSeason.dataByKind;
export const allItems = defaultSeason.allItems;
export const itemById = defaultSeason.itemById;

export const kindLabels: Record<Kind, string> = {
  hero: '英雄',
  player: '棋手',
  talent: '天赋',
  equipment: '装备',
  effect: '效果牌',
};
