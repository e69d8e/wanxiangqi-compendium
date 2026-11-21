import { describe, expect, it } from 'vitest';
import { allItems, dataByKind, heroes, itemById, meta, players } from '../src/data';
import { isCurrent, statusLabel } from '../src/lib/catalog';
import { coreRules, glossary, upgradeCosts } from '../src/data/mechanics';

describe('数据集完整性', () => {
  it('分类数量与 meta 一致', () => {
    expect(heroes.length).toBe(86);
    expect(players.length).toBe(21);
    expect(dataByKind.talent.length).toBe(300);
    expect(dataByKind.equipment.length).toBe(95);
    expect(dataByKind.effect.length).toBe(101);
    expect(allItems.length).toBe(603);
    expect(meta.totalCount).toBe(603);
  });

  it('当前收录数与 meta 一致', () => {
    expect(allItems.filter(isCurrent).length).toBe(meta.currentCount);
    expect(meta.currentCount).toBe(581);
    for (const [kind, counts] of Object.entries(meta.counts)) {
      const items = dataByKind[kind as keyof typeof dataByKind];
      expect(items.length, kind).toBe(counts.total);
      expect(items.filter(isCurrent).length, kind).toBe(counts.current);
    }
  });

  it('id 唯一，且条目必须有名称、来源与本地图片', () => {
    expect(itemById.size).toBe(allItems.length);
    for (const item of allItems) {
      expect(item.name, item.id).toBeTruthy();
      expect(item.sourceUrl, item.id).toMatch(/^https?:\/\//);
      expect(item.localImage, item.id).toMatch(/^\/images\//);
      expect(item.searchText.length, item.id).toBeGreaterThan(0);
    }
  });

  it('每个英雄都有技能与基础属性', () => {
    for (const hero of heroes) {
      expect(hero.officialSkill?.name, hero.id).toBeTruthy();
      expect(hero.officialSkill?.enhancements?.length, hero.id).toBe(3);
      expect(hero.rawBaseStats?.hp, hero.id).toBeGreaterThan(0);
    }
  });
});

describe('公告修订层', () => {
  const card = (playerName: string, cardId: number) => {
    const player = players.find((entry) => entry.name === playerName);
    return player?.cards?.find((entry) => Number(entry.id) === cardId);
  };

  it('嬴律「并购红利」采用 v1.11.1 文案', () => {
    const target = card('嬴律', 94352);
    expect(target?.description).toContain('单回合内合成第4次');
    expect(target?.sourceUpdate?.id).toBe('18956191');
    expect(statusLabel(itemById.get('player-43')!)).toBe('当前收录');
  });

  it('乔汐「潮汐的交响」采用 v1.9.4 文案', () => {
    const target = card('乔汐', 92210);
    expect(target?.description).toContain('触发2次');
    expect(target?.sourceUpdate?.id).toBe('18943094');
  });

  it('安琪拉模块数值按 v1.9.1 修订', () => {
    expect(card('安琪拉', 95153)?.description).toContain('30%');
    expect(card('安琪拉', 95163)?.description).toContain('125%');
  });

  it('无法裁定的数值分歧必须保留提示', () => {
    const sunbin = itemById.get('hero-sunbin');
    expect(sunbin?.caveat).toContain('50+100%');
  });
});

describe('玩法机制数据', () => {
  it('升级能量五段合计 87', () => {
    expect(upgradeCosts.map((step) => step.cost)).toEqual([7, 13, 17, 23, 27]);
    expect(upgradeCosts.reduce((sum, step) => sum + step.cost, 0)).toBe(87);
  });

  it('核心规则与关键词数量', () => {
    expect(coreRules.length).toBeGreaterThanOrEqual(9);
    expect(glossary.length).toBeGreaterThanOrEqual(18);
  });
});
