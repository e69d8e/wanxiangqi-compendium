import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { itemSubtitle } from '../lib/catalog';
import { makeItemHash } from '../lib/router';
import { useModalDialog } from '../lib/useModalDialog';
import type { CatalogItem, Kind, SeasonDataset } from '../types';
import { CardImage } from './CardImage';

const kindLabels: Record<Kind, string> = {
  hero: '英雄',
  player: '棋手',
  talent: '天赋',
  equipment: '装备',
  effect: '效果牌',
};

interface Props {
  season: SeasonDataset;
  onClose: () => void;
  onSelect: (item: CatalogItem) => void;
}

export function GlobalSearch({ season, onClose, onSelect }: Props) {
  const { allItems, meta } = season;
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const inputId = useId();
  const listId = useId();

  const { dialogRef, requestClose, closedByProps } = useModalDialog(true, onClose);

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return allItems.filter((item) => item.kind === 'hero').slice(0, 7);
    return allItems.filter((item) => item.searchText.toLocaleLowerCase().includes(needle)).slice(0, 30);
  }, [query, allItems]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Debounce live-region announcements so screen readers aren't spammed per keystroke
  useEffect(() => {
    if (!query.trim()) {
      setAnnouncement('');
      return;
    }
    const timer = window.setTimeout(() => {
      setAnnouncement(
        results.length === 0
          ? '没有匹配结果'
          : `找到 ${results.length}${results.length === 30 ? ' 条以上' : ' 条'}匹配结果`,
      );
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, results.length]);

  const move = (delta: number) => {
    setActive((current) => {
      if (!results.length) return 0;
      const next = (current + delta + results.length) % results.length;
      const node = listRef.current?.children[next] as HTMLElement | undefined;
      node?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  };

  const commit = (item?: CatalogItem) => {
    if (!item) return;
    onSelect(item);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // IME-safe Enter handling (includes keyCode === 229 fallback for Safari WebKit bug 165004)
    const isComposing = event.nativeEvent.isComposing || event.keyCode === 229;

    if (event.key === 'Enter') {
      event.preventDefault();
      if (isComposing) return;
      commit(results[active]);
      return;
    }

    if (isComposing) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Home' && results.length > 0) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End' && results.length > 0) {
      event.preventDefault();
      setActive(results.length - 1);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="archive-dialog search-dialog"
      aria-labelledby={titleId}
      {...closedByProps}
    >
      <h1 id={titleId} className="visually-hidden">
        全站搜索
      </h1>

      <div className="search-input-row">
        <Search size={21} aria-hidden="true" />
        <label htmlFor={inputId} className="visually-hidden">
          搜索英雄、棋手、天赋、装备或效果牌
        </label>
        <input
          id={inputId}
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results[active] ? `search-result-${results[active].id}` : undefined}
          placeholder="输入英雄、棋手、天赋、阵营或效果…"
        />
        <button
          type="button"
          className="icon-button"
          onClick={() => void requestClose()}
          aria-label="关闭搜索"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="search-context">
        <span>
          {query
            ? `找到 ${results.length}${results.length === 30 ? '+' : ''} 条匹配`
            : '试试“河洛”、“觉醒”或“能量”'}
        </span>
        <span className="search-keys" aria-hidden="true">
          <kbd>↑↓ 选择</kbd>
          <kbd>↵ 打开</kbd>
          <kbd>ESC 关闭</kbd>
        </span>
      </div>

      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div className="search-results" id={listId} role="listbox" aria-label="搜索结果" ref={listRef}>
        {results.map((item, index) => (
          <a
            key={item.id}
            id={`search-result-${item.id}`}
            href={makeItemHash(item, meta.id)}
            role="option"
            aria-selected={index === active}
            className={`search-result-item ${index === active ? 'is-active' : ''}`}
            onMouseMove={() => setActive(index)}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                return;
              }
              event.preventDefault();
              commit(item);
            }}
          >
            <CardImage item={item} decorative />
            <span className="search-result-copy">
              <strong>{item.name}</strong>
              <small>
                {kindLabels[item.kind]} · {itemSubtitle(item)}
              </small>
              <p>{item.original ?? item.skillSections?.[0]?.text}</p>
            </span>
            <ArrowUpRight className="search-result-arrow" size={18} aria-hidden="true" />
          </a>
        ))}
        {query && results.length === 0 && (
          <div className="search-empty">没有匹配结果，换个关键词试试。</div>
        )}
      </div>

      <div className="search-footer">
        <span>搜索范围：{allItems.length} 条本地资料</span>
        <span>
          {meta.label} · {meta.currentPatch}
        </span>
      </div>
    </dialog>
  );
}
