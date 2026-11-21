import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { allItems, kindLabels } from '../data';
import { itemSubtitle } from '../lib/catalog';
import type { CatalogItem } from '../types';
import { CardImage } from './CardImage';

export function GlobalSearch({ onClose, onSelect }: { onClose: () => void; onSelect: (item: CatalogItem) => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return allItems.filter((item) => item.kind === 'hero').slice(0, 7);
    return allItems.filter((item) => item.searchText.toLocaleLowerCase().includes(needle)).slice(0, 30);
  }, [query]);

  useEffect(() => { setActive(0); }, [query]);

  const move = (delta: number) => {
    setActive((current) => {
      if (!results.length) return 0;
      const next = (current + delta + results.length) % results.length;
      const node = listRef.current?.children[next] as HTMLElement | undefined;
      node?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  };

  const commit = (index: number) => {
    const item = results[index];
    if (item) onSelect(item);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
    else if (event.key === 'Enter') { event.preventDefault(); commit(active); }
    else if (event.key === 'Home') { event.preventDefault(); setActive(0); }
    else if (event.key === 'End') { event.preventDefault(); setActive(results.length - 1); }
  };

  return <div className="search-overlay" role="dialog" aria-modal="true" aria-label="全站搜索" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="search-command">
      <div className="search-input-row"><Search size={23} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onInputKeyDown} role="combobox" aria-expanded="true" aria-controls="search-result-list" aria-autocomplete="list" aria-activedescendant={results[active] ? `search-result-${results[active].id}` : undefined} placeholder="输入英雄、棋手、天赋、阵营或效果…" /><button className="icon-button" onClick={onClose} aria-label="关闭搜索"><X size={20} /></button></div>
      <div className="search-context"><span>{query ? `找到 ${results.length}${results.length === 30 ? '+' : ''} 条匹配` : '试试“河洛”、“觉醒”或“能量”'}</span><span className="search-keys"><kbd>↑↓ 选择</kbd><kbd>↵ 打开</kbd><kbd>ESC 关闭</kbd></span></div>
      <div className="search-results" id="search-result-list" role="listbox" aria-label="搜索结果" ref={listRef}>{results.map((item, index) => <button key={item.id} id={`search-result-${item.id}`} role="option" aria-selected={index === active} className={index === active ? 'is-active' : ''} onMouseMove={() => setActive(index)} onClick={() => onSelect(item)}><CardImage item={item} /><span><strong>{item.name}</strong><small>{kindLabels[item.kind]} · {itemSubtitle(item)}</small><p>{item.original ?? item.skillSections?.[0]?.text}</p></span><ArrowUpRight size={18} /></button>)}{query && results.length === 0 && <div className="search-empty">没有匹配结果，换个关键词试试。</div>}</div>
      <div className="search-footer"><span>搜索范围：{allItems.length} 条本地资料</span><span>正式服 S1 · v1.11.1</span></div>
    </div>
  </div>;
}
