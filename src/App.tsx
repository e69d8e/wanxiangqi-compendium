import { useCallback, useEffect, useState } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { getSeason, seasons } from './data';
import type { CatalogItem, Kind, View } from './types';
import { makeHash, readHash } from './lib/router';
import { Home } from './components/Home';
import { CatalogView } from './components/CatalogView';
import { DetailDrawer } from './components/DetailDrawer';
import { GlobalSearch } from './components/GlobalSearch';
import { Mechanics } from './components/Mechanics';
import { SeasonSwitcher } from './components/SeasonSwitcher';
import { Sources } from './components/Sources';

const navItems: { view: View; label: string }[] = [
  { view: 'heroes', label: '英雄' }, { view: 'players', label: '棋手' },
  { view: 'talents', label: '天赋' }, { view: 'equipment', label: '装备' },
  { view: 'effects', label: '效果牌' }, { view: 'mechanics', label: '玩法机制' },
];
const kindViews: Record<Kind, View> = { hero: 'heroes', player: 'players', talent: 'talents', equipment: 'equipment', effect: 'effects' };

export default function App() {
  const [location, setLocation] = useState(readHash);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const season = getSeason(location.params.get('season'));
  const selected = location.params.get('item') ? season.itemById.get(location.params.get('item')!) : undefined;

  useEffect(() => {
    const onHash = () => { setLocation(readHash()); setMenuOpen(false); setSearchOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); };
    window.addEventListener('hashchange', onHash);
    if (!window.location.hash) window.history.replaceState(null, '', '#/');
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const current = readHash();
    if (!current.params.get('season')) {
      current.params.set('season', season.meta.id);
      window.history.replaceState(null, '', makeHash(current.view, current.params));
    }
  }, [season.meta.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen((open) => !open); }
      if (event.key === '/' && !editing && !selected) { event.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const go = useCallback((view: View, params: Record<string, string> = {}, seasonId: string) => {
    const next = new URLSearchParams(params);
    next.set('season', seasonId);
    window.location.hash = makeHash(view, next);
  }, []);

  const navigate = useCallback((view: View, params?: Record<string, string>) => {
    go(view, params, season.meta.id);
  }, [go, season.meta.id]);

  const switchSeason = useCallback((seasonId: string) => {
    go(location.view, {}, seasonId);
  }, [go, location.view]);

  const openItem = useCallback((item: CatalogItem) => {
    const current = readHash();
    const activeSeason = getSeason(current.params.get('season'));
    const view = kindViews[item.kind];
    const params = current.view === view ? current.params : new URLSearchParams();
    params.set('season', activeSeason.meta.id);
    params.set('item', item.id);
    setSearchOpen(false);
    window.location.hash = makeHash(view, params);
  }, []);

  const closeItem = useCallback(() => {
    const current = readHash();
    current.params.delete('item');
    window.location.hash = makeHash(current.view, current.params);
  }, []);

  const isCatalog = ['heroes', 'players', 'talents', 'equipment', 'effects'].includes(location.view);
  const catalogKind: Record<string, Kind> = { heroes: 'hero', players: 'player', talents: 'talent', equipment: 'equipment', effects: 'effect' };

  return <>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); const main = document.getElementById('main-content'); main?.focus(); main?.scrollIntoView({ block: 'start' }); }}>跳至主要内容</a>
    <header className="site-header"><div className="header-inner">
      <button className="brand" onClick={() => navigate('home')} aria-label="万象棋谱首页"><span className="brand-mark"><i /><b>万</b></span><span><strong>万象棋谱</strong><small>WANXIANG ARCHIVE</small></span></button>
      <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="主要导航">{navItems.map((item) => <button key={item.view} className={location.view === item.view ? 'active' : ''} aria-current={location.view === item.view ? 'page' : undefined} onClick={() => navigate(item.view)}>{item.label}</button>)}<button className={location.view === 'sources' ? 'active' : ''} aria-current={location.view === 'sources' ? 'page' : undefined} onClick={() => navigate('sources')}>来源说明</button></nav>
      <div className="header-actions"><SeasonSwitcher seasons={seasons} currentId={season.meta.id} patch={season.meta.currentPatch} onSelect={switchSeason} /><button className="header-search" onClick={() => setSearchOpen(true)}><Search size={17} /><span>搜索档案</span><kbd>⌘ K</kbd></button><button className="mobile-menu icon-button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? '关闭导航' : '打开导航'}>{menuOpen ? <X /> : <Menu />}</button></div>
    </div></header>

    <div id="main-content" tabIndex={-1}>
      {location.view === 'home' && <Home season={season} onNavigate={navigate} onSelect={openItem} onSearch={() => setSearchOpen(true)} />}
      {isCatalog && <CatalogView key={`${season.meta.id}-${location.view}`} season={season} view={location.view as 'heroes'} items={season.dataByKind[catalogKind[location.view]]} params={location.params} onSelect={openItem} />}
      {location.view === 'mechanics' && <Mechanics season={season} />}
      {location.view === 'sources' && <Sources season={season} onNavigate={navigate} />}
    </div>

    <footer className="site-footer"><div className="page-shell"><div className="footer-brand"><span className="brand-mark"><i /><b>万</b></span><div><strong>万象棋谱</strong><p>非官方玩家资料站 · 游戏素材与名称权利归原权利人所有</p></div></div><div className="footer-links"><a href="https://wxq.qq.com/" target="_blank" rel="noreferrer">游戏官网</a><a href="https://wxq.qq.com/cp/a202609xszy/" target="_blank" rel="noreferrer">官方新手指引</a><button onClick={() => navigate('sources')}>来源与免责声明</button></div><div className="footer-bottom"><span>{season.meta.label} · 核验至 {season.meta.verifiedAt}</span><span>正式服赛季独立归档 · 不收录体验服测试集</span></div></div></footer>

    {searchOpen && <GlobalSearch season={season} onClose={() => setSearchOpen(false)} onSelect={openItem} />}
    {selected && <DetailDrawer key={`${season.meta.id}-${selected.id}`} item={selected} verifiedAt={season.meta.verifiedAt} onClose={closeItem} />}
  </>;
}
