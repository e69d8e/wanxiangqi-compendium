import { useEffect, useMemo, useState } from 'react';
import { Grid2X2, List, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import type { CatalogItem, Kind, SeasonDataset } from '../types';
import { isCurrent, itemSubtitle, uniqueValues } from '../lib/catalog';
import { makeHash } from '../lib/router';
import type { View } from '../types';
import { CardImage } from './CardImage';
import { StatusBadge } from './StatusBadge';

const configs = {
  heroes: { kind: 'hero' as Kind, index: '01', title: '英雄棋谱', description: '阵营、品阶、技能、觉醒与等级成长，一张卡读懂一枚棋子。', primary: 'faction', primaryLabel: '阵营', secondary: undefined, secondaryLabel: '' },
  players: { kind: 'player' as Kind, index: '02', title: '棋手档案', description: '技能、秘技任务、专属天赋与关联卡牌，保留每次公告修订。', primary: undefined, primaryLabel: '', secondary: undefined, secondaryLabel: '' },
  talents: { kind: 'talent' as Kind, index: '03', title: '天赋总览', description: '按品阶、天赋包与投放阶段检索，不把旧卡面当成当前效果。', primary: 'talentGroup', primaryLabel: '天赋包', secondary: 'talentStage', secondaryLabel: '投放阶段' },
  equipment: { kind: 'equipment' as Kind, index: '04', title: '装备手册', description: '基础、普通、特殊与天赋装备，追踪铸造结果和关联卡。', primary: 'subtype', primaryLabel: '装备分类', secondary: 'equipmentType', secondaryLabel: '装备类型' },
  effects: { kind: 'effect' as Kind, index: '05', title: '效果牌集', description: '通用与阵营效果牌，查看品阶、获取方式与完整效果原文。', primary: 'faction', primaryLabel: '阵营', secondary: undefined, secondaryLabel: '' },
} as const;

type FilterKey = 'faction' | 'subtype' | 'equipmentType' | 'talentGroup' | 'talentStage';

interface Props {
  season: SeasonDataset;
  view: keyof typeof configs;
  items: CatalogItem[];
  params: URLSearchParams;
  onSelect: (item: CatalogItem) => void;
}

export function CatalogView({ season, view, items, params, onSelect }: Props) {
  const config = configs[view];
  const { meta } = season;
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [primary, setPrimary] = useState(params.get('filter') ?? 'all');
  const [secondary, setSecondary] = useState(params.get('filter2') ?? 'all');
  const [quality, setQuality] = useState(params.get('quality') ?? 'all');
  const [status, setStatus] = useState(params.get('status') ?? 'current');
  const [layout, setLayout] = useState(params.get('layout') ?? 'cards');
  const [visible, setVisible] = useState(60);

  const primaryValues = config.primary ? uniqueValues(items, config.primary as FilterKey) : [];
  const secondaryValues = config.secondary ? uniqueValues(items, config.secondary as FilterKey) : [];
  const qualities = [...new Set(items.map((item) => item.quality).filter((value): value is number => value != null))].sort();

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      if (needle && !item.searchText.toLocaleLowerCase().includes(needle)) return false;
      if (config.primary && primary !== 'all' && item[config.primary as FilterKey] !== primary) return false;
      if (config.secondary && secondary !== 'all' && item[config.secondary as FilterKey] !== secondary) return false;
      if (quality !== 'all' && item.quality !== Number(quality)) return false;
      if (status === 'current' && !isCurrent(item)) return false;
      if (status === 'history' && isCurrent(item)) return false;
      if (status === 'offshelf' && !item.temporarilyOffShelf) return false;
      if (status === 'revised' && !item.sourceUpdate) return false;
      return true;
    });
  }, [items, query, primary, secondary, quality, status, config]);

  useEffect(() => setVisible(60), [query, primary, secondary, quality, status]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (primary !== 'all') next.set('filter', primary);
    if (secondary !== 'all') next.set('filter2', secondary);
    if (quality !== 'all') next.set('quality', quality);
    if (status !== 'current') next.set('status', status);
    if (layout !== 'cards') next.set('layout', layout);
    next.set('season', meta.id);
    const selected = new URLSearchParams(window.location.hash.split('?')[1]).get('item');
    if (selected) next.set('item', selected);
    window.history.replaceState(null, '', makeHash(view as View, next));
  }, [query, primary, secondary, quality, status, layout, view, meta.id]);

  const reset = () => { setQuery(''); setPrimary('all'); setSecondary('all'); setQuality('all'); setStatus('current'); };

  return (
    <main className="catalog-page page-shell">
      <header className="catalog-heading">
        <div><span className="chapter-number">{config.index}</span><div><span className="eyebrow">{meta.shortLabel} ARCHIVE / {config.kind.toUpperCase()}</span><h1>{config.title}</h1></div></div>
        <p>{config.description}<br /><small className="catalog-season-note">{meta.label} · {meta.currentPatch}</small></p>
      </header>

      <section className="filter-panel" aria-label="资料筛选">
        <label className="catalog-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`搜索${config.title.replace(/棋谱|档案|总览|手册|集/g, '')}名称、效果或关键词…`} /><kbd>{items.length} 条</kbd></label>
        <div className="filter-row">
          <span className="filter-caption"><SlidersHorizontal size={15} /> 筛选</span>
          {config.primary && <label><span className="sr-only">{config.primaryLabel}</span><select value={primary} onChange={(event) => setPrimary(event.target.value)}><option value="all">全部{config.primaryLabel}</option>{primaryValues.map((value) => <option key={value}>{value}</option>)}</select></label>}
          {config.secondary && <label><span className="sr-only">{config.secondaryLabel}</span><select value={secondary} onChange={(event) => setSecondary(event.target.value)}><option value="all">全部{config.secondaryLabel}</option>{secondaryValues.map((value) => <option key={value}>{value}</option>)}</select></label>}
          {qualities.length > 0 && <label><span className="sr-only">品阶</span><select value={quality} onChange={(event) => setQuality(event.target.value)}><option value="all">全部品阶</option>{qualities.map((value) => <option key={value} value={value}>{value} 阶</option>)}</select></label>}
          <label><span className="sr-only">版本状态</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="current">当前收录</option><option value="all">含历史条目</option><option value="history">仅历史待核验</option><option value="offshelf">暂下架</option><option value="revised">关联公告</option></select></label>
          <button className="reset-button" onClick={reset} title="重置筛选"><RotateCcw size={15} /> 重置</button>
          <div className="layout-toggle" role="group" aria-label="展示方式"><button className={layout === 'cards' ? 'active' : ''} onClick={() => setLayout('cards')} aria-pressed={layout === 'cards'} aria-label="卡片展示"><Grid2X2 size={17} /></button><button className={layout === 'list' ? 'active' : ''} onClick={() => setLayout('list')} aria-pressed={layout === 'list'} aria-label="列表展示"><List size={18} /></button></div>
        </div>
      </section>

      <div className="result-meta"><span><strong>{filtered.length}</strong> 条匹配资料</span><span>点击条目查看完整档案与来源</span></div>

      {filtered.length === 0 ? <div className="empty-state"><span>空</span><h2>没有找到对应档案</h2><p>试试缩短关键词，或清除阵营、品阶与状态筛选。</p><button className="primary-button" onClick={reset}>清除全部筛选</button></div>
        : layout === 'cards' ? <div className="catalog-grid">{filtered.slice(0, visible).map((item, index) => <button className={`catalog-card card-${item.kind}`} key={item.id} onClick={() => onSelect(item)} data-faction={item.faction}>
          <div className="card-image-wrap"><CardImage item={item} eager={index < 12} /><span className="card-index">{String(index + 1).padStart(3, '0')}</span>{item.quality != null && <span className="card-quality">{item.quality} 阶</span>}</div>
          <div className="card-copy"><span className="card-subtitle">{itemSubtitle(item)}</span><h2>{item.name}</h2><p>{item.original ?? item.skillSections?.[0]?.text ?? '查看棋手技能与关联卡牌'}</p><div className="card-footer"><StatusBadge item={item} /><span>查阅 →</span></div></div>
        </button>)}</div>
        : <div className="compact-list">{filtered.slice(0, visible).map((item) => <button key={item.id} onClick={() => onSelect(item)}><CardImage item={item} /><span className="list-name"><strong>{item.name}</strong><small>{itemSubtitle(item)}</small></span><span className="list-effect">{item.original ?? item.skillSections?.[0]?.text}</span>{item.quality != null && <span className="list-quality">{item.quality} 阶</span>}<StatusBadge item={item} /></button>)}</div>}

      {visible < filtered.length && <button className="load-more" onClick={() => setVisible((count) => count + 60)}>继续翻阅 <span>{visible} / {filtered.length}</span></button>}
    </main>
  );
}
