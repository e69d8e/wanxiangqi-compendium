import { useEffect, useId, useMemo, useState } from 'react';
import { Bookmark, Grid2X2, List, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import type { CatalogItem, Kind, SeasonDataset, View } from '../types';
import { isCurrent, itemSubtitle, uniqueValues } from '../lib/catalog';
import { makeHash, makeItemHash } from '../lib/router';
import type { FavoriteSyncMode } from '../lib/useFavorites';
import { useModalDialog } from '../lib/useModalDialog';
import { CardImage } from './CardImage';
import { StatusBadge } from './StatusBadge';

const configs = {
  heroes: {
    kind: 'hero' as Kind,
    index: '01',
    title: '英雄棋谱',
    subject: '英雄',
    description: '阵营、品阶、技能、觉醒与等级成长，一张卡读懂一枚棋子。',
    primary: 'faction',
    primaryLabel: '阵营',
    secondary: undefined,
    secondaryLabel: '',
  },
  players: {
    kind: 'player' as Kind,
    index: '02',
    title: '棋手档案',
    subject: '棋手',
    description: '技能、秘技任务、专属天赋与关联卡牌，保留每次公告修订。',
    primary: undefined,
    primaryLabel: '',
    secondary: undefined,
    secondaryLabel: '',
  },
  talents: {
    kind: 'talent' as Kind,
    index: '03',
    title: '天赋总览',
    subject: '天赋',
    description: '按品阶、天赋包与投放阶段检索，不把旧卡面当成当前效果。',
    primary: 'talentGroup',
    primaryLabel: '天赋包',
    secondary: 'talentStage',
    secondaryLabel: '投放阶段',
  },
  equipment: {
    kind: 'equipment' as Kind,
    index: '04',
    title: '装备手册',
    subject: '装备',
    description: '基础、普通、特殊与天赋装备，追踪铸造结果和关联卡。',
    primary: 'subtype',
    primaryLabel: '装备分类',
    secondary: 'equipmentType',
    secondaryLabel: '装备类型',
  },
  effects: {
    kind: 'effect' as Kind,
    index: '05',
    title: '效果牌集',
    subject: '效果牌',
    description: '通用与阵营效果牌，查看品阶、获取方式与完整效果原文。',
    primary: 'faction',
    primaryLabel: '阵营',
    secondary: undefined,
    secondaryLabel: '',
  },
} as const;

type FilterKey = 'faction' | 'subtype' | 'equipmentType' | 'talentGroup' | 'talentStage';

const emptyFavoriteSet: ReadonlySet<string> = new Set();

interface Props {
  season: SeasonDataset;
  view: keyof typeof configs;
  items: CatalogItem[];
  params: URLSearchParams;
  favoriteIds?: ReadonlySet<string>;
  favoriteSyncMode?: FavoriteSyncMode;
  syncNotice?: string | null;
  onSelect: (item: CatalogItem) => void;
}

export function CatalogView({
  season,
  view,
  items,
  params,
  favoriteIds = emptyFavoriteSet,
  favoriteSyncMode = 'local',
  syncNotice,
  onSelect,
}: Props) {
  const config = configs[view];
  const { meta } = season;
  const searchId = useId();
  const primaryId = useId();
  const secondaryId = useId();
  const qualityId = useId();
  const statusId = useId();
  const sheetId = useId();

  const [query, setQuery] = useState(params.get('q') ?? '');
  const [primary, setPrimary] = useState(params.get('filter') ?? 'all');
  const [secondary, setSecondary] = useState(params.get('filter2') ?? 'all');
  const [quality, setQuality] = useState(params.get('quality') ?? 'all');
  const [status, setStatus] = useState(params.get('status') ?? 'current');
  const [layout, setLayout] = useState(params.get('layout') ?? 'cards');
  const [visible, setVisible] = useState(60);
  const [sheetOpen, setSheetOpen] = useState(false);

  const primaryValues = config.primary ? uniqueValues(items, config.primary as FilterKey) : [];
  const secondaryValues = config.secondary ? uniqueValues(items, config.secondary as FilterKey) : [];
  const qualities = [...new Set(items.map((item) => item.quality).filter((value): value is number => value != null))].sort(
    (left, right) => left - right,
  );

  const activeFilterCount =
    (primary !== 'all' ? 1 : 0) +
    (secondary !== 'all' ? 1 : 0) +
    (quality !== 'all' ? 1 : 0) +
    (status !== 'current' ? 1 : 0);

  const favoriteCountInView = useMemo(
    () => items.reduce((count, item) => count + (favoriteIds.has(item.id) ? 1 : 0), 0),
    [items, favoriteIds],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      if (needle && !item.searchText.toLocaleLowerCase().includes(needle)) return false;
      if (config.primary && primary !== 'all' && item[config.primary as FilterKey] !== primary) return false;
      if (config.secondary && secondary !== 'all' && item[config.secondary as FilterKey] !== secondary) return false;
      if (quality !== 'all' && item.quality !== Number(quality)) return false;
      if (status === 'current' && !isCurrent(item)) return false;
      if (status === 'favorites' && !favoriteIds.has(item.id)) return false;
      if (status === 'history' && isCurrent(item)) return false;
      if (status === 'offshelf' && !item.temporarilyOffShelf) return false;
      if (status === 'revised' && !item.sourceUpdate) return false;
      return true;
    });
  }, [items, query, primary, secondary, quality, status, config, favoriteIds]);

  useEffect(() => {
    setVisible(60);
  }, [query, primary, secondary, quality, status]);

  const currentParams = useMemo(() => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (primary !== 'all') next.set('filter', primary);
    if (secondary !== 'all') next.set('filter2', secondary);
    if (quality !== 'all') next.set('quality', quality);
    if (status !== 'current') next.set('status', status);
    if (layout !== 'cards') next.set('layout', layout);
    next.set('season', meta.id);
    return next;
  }, [query, primary, secondary, quality, status, layout, meta.id]);

  useEffect(() => {
    const next = new URLSearchParams(currentParams);
    const selected = new URLSearchParams(window.location.hash.split('?')[1]).get('item');
    if (selected) next.set('item', selected);
    const nextHash = makeHash(view as View, next);
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [currentParams, view]);

  const reset = () => {
    setQuery('');
    setPrimary('all');
    setSecondary('all');
    setQuality('all');
    setStatus('current');
  };

  const handleItemClick = (event: React.MouseEvent<HTMLAnchorElement>, item: CatalogItem) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    onSelect(item);
  };

  return (
    <main className="catalog-page page-shell">
      <header className="catalog-heading">
        <div>
          <span className="chapter-number" aria-hidden="true">
            {config.index}
          </span>
          <div>
            <span className="eyebrow">
              {meta.shortLabel} ARCHIVE / {config.kind.toUpperCase()}
            </span>
            <h1 tabIndex={-1}>{config.title}</h1>
          </div>
        </div>
        <p>
          {config.description}
          <br />
          <small className="catalog-season-note">
            {meta.label} · {meta.currentPatch}
          </small>
        </p>
      </header>

      <search className="filter-panel" aria-label={`${config.title}检索与筛选`}>
        <div className="filter-panel-inner">
          <div className="catalog-search-row">
            <div className="catalog-search-box">
              <Search size={18} aria-hidden="true" />
              <label htmlFor={searchId} className="visually-hidden">
                搜索{config.subject}名称、效果或关键词
              </label>
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`搜索${config.subject}名称、效果或关键词…`}
              />
              <kbd className="catalog-count-pill" aria-hidden="true">
                {items.length} 条
              </kbd>
            </div>

            <button
              type="button"
              className="mobile-filter-trigger"
              data-active={activeFilterCount > 0 ? 'true' : 'false'}
              aria-expanded={sheetOpen}
              aria-controls={sheetId}
              onClick={() => setSheetOpen(true)}
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              <span>筛选</span>
              {activeFilterCount > 0 && (
                <span className="filter-badge-count">{activeFilterCount}</span>
              )}
            </button>

            <div className="layout-toggle" role="group" aria-label="展示方式">
              <button
                type="button"
                className={layout === 'cards' ? 'active' : ''}
                onClick={() => setLayout('cards')}
                aria-pressed={layout === 'cards'}
                aria-label="卡片展示"
              >
                <Grid2X2 size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={layout === 'list' ? 'active' : ''}
                onClick={() => setLayout('list')}
                aria-pressed={layout === 'list'}
                aria-label="列表展示"
              >
                <List size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="filter-row">
            <span className="filter-caption" aria-hidden="true">
              <SlidersHorizontal size={14} /> 筛选
            </span>

            {config.primary && (
              <>
                <label htmlFor={primaryId} className="visually-hidden">
                  {config.primaryLabel}
                </label>
                <select
                  id={primaryId}
                  name="filter"
                  className="themed-select"
                  value={primary}
                  onChange={(event) => setPrimary(event.target.value)}
                >
                  <option value="all">全部{config.primaryLabel}</option>
                  {primaryValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </>
            )}

            {config.secondary && (
              <>
                <label htmlFor={secondaryId} className="visually-hidden">
                  {config.secondaryLabel}
                </label>
                <select
                  id={secondaryId}
                  name="filter2"
                  className="themed-select"
                  value={secondary}
                  onChange={(event) => setSecondary(event.target.value)}
                >
                  <option value="all">全部{config.secondaryLabel}</option>
                  {secondaryValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </>
            )}

            {qualities.length > 0 && (
              <>
                <label htmlFor={qualityId} className="visually-hidden">
                  品阶
                </label>
                <select
                  id={qualityId}
                  name="quality"
                  className="themed-select"
                  value={quality}
                  onChange={(event) => setQuality(event.target.value)}
                >
                  <option value="all">全部品阶</option>
                  {qualities.map((value) => (
                    <option key={value} value={value}>
                      {value} 阶
                    </option>
                  ))}
                </select>
              </>
            )}

            <label htmlFor={statusId} className="visually-hidden">
              版本状态
            </label>
            <select
              id={statusId}
              name="status"
              className="themed-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="current">当前收录</option>
              <option value="favorites">
                我的收藏{favoriteCountInView > 0 ? ` (${favoriteCountInView})` : ''}
              </option>
              <option value="all">含历史条目</option>
              <option value="history">仅历史待核验</option>
              <option value="offshelf">暂下架</option>
              <option value="revised">关联公告</option>
            </select>

            <button type="button" className="reset-button" onClick={reset}>
              <RotateCcw size={15} aria-hidden="true" /> 重置
            </button>
          </div>
        </div>
      </search>

      <div className="result-meta">
        <span role="status" aria-live="polite">
          <strong>{filtered.length}</strong> 条匹配资料
          {status === 'favorites' && (
            <small className="result-sync-tag">
              {' '}· {favoriteSyncMode === 'cloud' ? '云收藏同步' : '本地收藏'}
            </small>
          )}
        </span>
        <span className="result-meta-hint">
          {syncNotice ?? '点击条目查看完整档案与来源'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-seal" aria-hidden="true">
            空
          </span>
          <h2>没有找到对应档案</h2>
          <p>试试缩短关键词，或清除阵营、品阶与状态筛选。</p>
          <button type="button" className="primary-button" onClick={reset}>
            清除全部筛选
          </button>
        </div>
      ) : layout === 'cards' ? (
        <div className="catalog-grid">
          {filtered.slice(0, visible).map((item, index) => {
            const href = makeItemHash(item, meta.id, view as View, currentParams);
            return (
              <article
                className={`catalog-card stretched-card card-${item.kind}`}
                key={item.id}
                data-faction={item.faction}
              >
                <div className="card-image-wrap">
                  <CardImage item={item} eager={index < 12} decorative />
                  <span className="card-index" aria-hidden="true">
                    {String(index + 1).padStart(3, '0')}
                  </span>
                  {item.quality != null && (
                    <span className="card-quality">{item.quality} 阶</span>
                  )}
                  {favoriteIds.has(item.id) && (
                    <span className="card-favorite-mark" aria-label="已收藏">
                      <Bookmark size={12} aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="card-copy">
                  <span className="card-subtitle">{itemSubtitle(item)}</span>
                  <h2>
                    <a
                      href={href}
                      className="card-link"
                      onClick={(event) => handleItemClick(event, item)}
                    >
                      {item.name}
                    </a>
                  </h2>
                  <p>{item.original ?? item.skillSections?.[0]?.text ?? '查看棋手技能与关联卡牌'}</p>
                  <div className="card-footer">
                    <StatusBadge item={item} />
                    <span className="card-action-hint" aria-hidden="true">
                      查阅 →
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="compact-list">
          {filtered.slice(0, visible).map((item) => {
            const href = makeItemHash(item, meta.id, view as View, currentParams);
            return (
              <article className="compact-row stretched-card" key={item.id}>
                <CardImage item={item} decorative />
                <div className="list-name">
                  <h2>
                    <a
                      href={href}
                      className="card-link"
                      onClick={(event) => handleItemClick(event, item)}
                    >
                      {item.name}
                    </a>
                    {favoriteIds.has(item.id) && (
                      <Bookmark className="list-favorite-mark" size={13} aria-label="已收藏" />
                    )}
                  </h2>
                  <small>{itemSubtitle(item)}</small>
                </div>
                <span className="list-effect">{item.original ?? item.skillSections?.[0]?.text}</span>
                <span className="list-quality" aria-hidden={item.quality == null ? 'true' : undefined}>
                  {item.quality != null ? `${item.quality} 阶` : '—'}
                </span>
                <StatusBadge item={item} />
              </article>
            );
          })}
        </div>
      )}

      {visible < filtered.length && (
        <button
          type="button"
          className="load-more"
          onClick={() => setVisible((count) => count + 60)}
        >
          继续翻阅{' '}
          <span>
            {visible} / {filtered.length}
          </span>
        </button>
      )}

      {sheetOpen && (
        <FilterSheetDialog
          id={sheetId}
          title={`${config.title}筛选`}
          primaryLabel={config.primary ? config.primaryLabel : undefined}
          primary={primary}
          primaryValues={primaryValues}
          onPrimaryChange={setPrimary}
          secondaryLabel={config.secondary ? config.secondaryLabel : undefined}
          secondary={secondary}
          secondaryValues={secondaryValues}
          onSecondaryChange={setSecondary}
          qualities={qualities}
          quality={quality}
          onQualityChange={setQuality}
          status={status}
          favoriteCount={favoriteCountInView}
          onStatusChange={setStatus}
          onReset={reset}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </main>
  );
}

interface FilterSheetProps {
  id: string;
  title: string;
  primaryLabel?: string;
  primary: string;
  primaryValues: string[];
  onPrimaryChange: (value: string) => void;
  secondaryLabel?: string;
  secondary: string;
  secondaryValues: string[];
  onSecondaryChange: (value: string) => void;
  qualities: number[];
  quality: string;
  onQualityChange: (value: string) => void;
  status: string;
  favoriteCount: number;
  onStatusChange: (value: string) => void;
  onReset: () => void;
  onClose: () => void;
}

function FilterSheetDialog({
  id,
  title,
  primaryLabel,
  primary,
  primaryValues,
  onPrimaryChange,
  secondaryLabel,
  secondary,
  secondaryValues,
  onSecondaryChange,
  qualities,
  quality,
  onQualityChange,
  status,
  favoriteCount,
  onStatusChange,
  onReset,
  onClose,
}: FilterSheetProps) {
  const titleId = useId();
  const { dialogRef, requestClose, closedByProps } = useModalDialog(true, onClose);

  return (
    <dialog
      ref={dialogRef}
      id={id}
      className="archive-dialog filter-sheet-dialog"
      aria-labelledby={titleId}
      {...closedByProps}
    >
      <div className="filter-sheet-header">
        <h1 id={titleId}>{title}</h1>
        <button
          type="button"
          className="icon-button"
          autoFocus
          aria-label="关闭筛选"
          onClick={() => void requestClose()}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="filter-sheet-body">
        {primaryLabel && (
          <label className="filter-sheet-field">
            <span>{primaryLabel}</span>
            <select
              name="mobile-filter"
              className="themed-select"
              value={primary}
              onChange={(event) => onPrimaryChange(event.target.value)}
            >
              <option value="all">全部{primaryLabel}</option>
              {primaryValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        )}

        {secondaryLabel && (
          <label className="filter-sheet-field">
            <span>{secondaryLabel}</span>
            <select
              name="mobile-filter2"
              className="themed-select"
              value={secondary}
              onChange={(event) => onSecondaryChange(event.target.value)}
            >
              <option value="all">全部{secondaryLabel}</option>
              {secondaryValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        )}

        {qualities.length > 0 && (
          <label className="filter-sheet-field">
            <span>品阶</span>
            <select
              name="mobile-quality"
              className="themed-select"
              value={quality}
              onChange={(event) => onQualityChange(event.target.value)}
            >
              <option value="all">全部品阶</option>
              {qualities.map((value) => (
                <option key={value} value={value}>
                  {value} 阶
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="filter-sheet-field">
          <span>版本状态</span>
          <select
            name="mobile-status"
            className="themed-select"
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
          >
            <option value="current">当前收录</option>
            <option value="favorites">
              我的收藏{favoriteCount > 0 ? ` (${favoriteCount})` : ''}
            </option>
            <option value="all">含历史条目</option>
            <option value="history">仅历史待核验</option>
            <option value="offshelf">暂下架</option>
            <option value="revised">关联公告</option>
          </select>
        </label>
      </div>

      <div className="filter-sheet-actions">
        <button type="button" className="secondary-button" onClick={onReset}>
          <RotateCcw size={15} aria-hidden="true" /> 重置
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => void requestClose()}
        >
          查看结果
        </button>
      </div>
    </dialog>
  );
}
