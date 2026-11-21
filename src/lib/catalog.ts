import type { CatalogItem } from '../types';

export function isCurrent(item: CatalogItem) {
  return item.versionStatus !== 'historical_pending';
}

export function isTextRevised(item: CatalogItem) {
  return Boolean(item.imageStatus && /已按|公告核对|公告更新/.test(item.imageStatus));
}

export function statusLabel(item: CatalogItem) {
  if (item.versionStatus === 'historical_pending') return '历史待核验';
  if (item.versionStatus === 'supplementary') return '补充收录';
  if (item.temporarilyOffShelf) return '暂下架';
  if (item.sourceUpdate) return isTextRevised(item) ? '公告修订' : '公告相关';
  return '当前收录';
}

export function statusHint(item: CatalogItem) {
  if (!item.sourceUpdate) return '当前版本收录，卡面文字与官网图鉴一致';
  const base = `关联正式服公告 ${item.sourceUpdate.id}（${item.sourceUpdate.date}）`;
  return isTextRevised(item)
    ? `${base}；正文已按公告更新，卡面图片保留官网原件`
    : `${base}；该公告涉及此条目，但卡面效果文字未按公告重写`;
}

export function uniqueValues(items: CatalogItem[], key: 'faction' | 'subtype' | 'equipmentType' | 'talentGroup' | 'talentStage') {
  return [...new Set(items.map((item) => item[key]).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export function itemSubtitle(item: CatalogItem) {
  if (item.kind === 'hero') return [item.faction, item.attackStyle, ...(item.officialKeywords ?? [])].filter(Boolean).join(' · ');
  if (item.kind === 'player') return item.skillSections?.map((section) => section.name).slice(0, 2).join(' · ') ?? '棋手档案';
  if (item.kind === 'equipment') return [item.subtype, item.equipmentType].filter(Boolean).join(' · ');
  if (item.kind === 'talent') return [item.talentGroup, item.talentStage].filter(Boolean).join(' · ');
  return item.faction ?? '通用';
}

export function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
