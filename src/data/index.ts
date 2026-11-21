import type { CatalogItem, CatalogMeta, Kind } from '../types';
import heroData from './heroes.json';
import playerData from './players.json';
import talentData from './talents.json';
import equipmentData from './equipment.json';
import effectData from './effects.json';
import metaData from './meta.json';

export const heroes = heroData as CatalogItem[];
export const players = playerData as CatalogItem[];
export const talents = talentData as CatalogItem[];
export const equipment = equipmentData as CatalogItem[];
export const effects = effectData as CatalogItem[];
export const meta = metaData as CatalogMeta;

export const dataByKind: Record<Kind, CatalogItem[]> = {
  hero: heroes,
  player: players,
  talent: talents,
  equipment,
  effect: effects,
};

export const allItems = [...heroes, ...players, ...talents, ...equipment, ...effects];
export const itemById = new Map(allItems.map((item) => [item.id, item]));

export const kindLabels: Record<Kind, string> = {
  hero: '英雄',
  player: '棋手',
  talent: '天赋',
  equipment: '装备',
  effect: '效果牌',
};
