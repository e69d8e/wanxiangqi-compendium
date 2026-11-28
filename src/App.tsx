import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Menu, Search, Share2 } from 'lucide-react';
import { loadSeasonDataset, resolveSeasonMeta, seasonMetas } from './data/loader';
import type { CatalogItem, Kind, SeasonDataset, View } from './types';
import { kindToView, makeHash, makeItemHash, makeToySharePath, readHash } from './lib/router';
import { initToyContainerAdaptation } from './lib/toySdk';
import { useFavorites } from './lib/useFavorites';
import { Home } from './components/Home';
import { MobileNavDialog } from './components/MobileNavDialog';
import { SeasonSwitcher } from './components/SeasonSwitcher';

// Code-split secondary routes and modal surfaces to keep the initial entry bundle lean
const CatalogView = lazy(() =>
  import('./components/CatalogView').then((mod) => ({ default: mod.CatalogView })),
);
const Mechanics = lazy(() =>
  import('./components/Mechanics').then((mod) => ({ default: mod.Mechanics })),
);
const Sources = lazy(() =>
  import('./components/Sources').then((mod) => ({ default: mod.Sources })),
);
const DetailDrawer = lazy(() =>
  import('./components/DetailDrawer').then((mod) => ({ default: mod.DetailDrawer })),
);
const GlobalSearch = lazy(() =>
  import('./components/GlobalSearch').then((mod) => ({ default: mod.GlobalSearch })),
);
const ShareModal = lazy(() =>
  import('./components/ShareModal').then((mod) => ({ default: mod.ShareModal })),
);

const navItems: readonly { view: View; label: string }[] = [
  { view: 'heroes', label: '英雄' },
  { view: 'players', label: '棋手' },
  { view: 'talents', label: '天赋' },
  { view: 'equipment', label: '装备' },
  { view: 'effects', label: '效果牌' },
  { view: 'mechanics', label: '玩法机制' },
  { view: 'sources', label: '来源说明' },
];

const catalogKind: Record<string, Kind> = {
  heroes: 'hero',
  players: 'player',
  talents: 'talent',
  equipment: 'equipment',
  effects: 'effect',
};

const viewTitles: Record<View | 'not-found', string> = {
  home: '万象棋谱 · 王者万象棋资料库',
  heroes: '英雄棋谱',
  players: '棋手档案',
  talents: '天赋总览',
  equipment: '装备手册',
  effects: '效果牌集',
  mechanics: '玩法机制',
  sources: '来源与核验',
  'not-found': '未找到档案',
};

const seasonMetaEntries = seasonMetas.map((meta) => ({ meta }));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

interface ShareTarget {
  title: string;
  subtitle: string;
  sharePath: string;
  fallbackUrl: string;
}

export default function App() {
  const [location, setLocation] = useState(() => readHash());
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [dataset, setDataset] = useState<SeasonDataset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const seasonMeta = resolveSeasonMeta(location.params.get('season'));
  const favorites = useFavorites(seasonMeta.id);
  const prevRouteRef = useRef({ view: location.view, season: seasonMeta.id });
  const hasNavigatedRef = useRef(false);
  // Track whether the current item drawer was pushed via in-app navigation
  // so closing pops history cleanly instead of pushing a duplicate Back entry.
  const openedItemInAppRef = useRef(false);

  // Sync Bilibili App Toy container safe areas & capsule clearance when inside Bilibili App
  useEffect(() => initToyContainerAdaptation(), []);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    loadSeasonDataset(seasonMeta.id)
      .then((loaded) => {
        if (active) setDataset(loaded);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : '加载赛季数据失败');
        }
      });
    return () => {
      active = false;
    };
  }, [seasonMeta.id]);

  const activeSeason = dataset && dataset.meta.id === seasonMeta.id ? dataset : null;
  const selectedItemId = location.params.get('item');
  const selected = useMemo(
    () => (selectedItemId && activeSeason ? activeSeason.itemById.get(selectedItemId) : undefined),
    [selectedItemId, activeSeason],
  );

  // Sync document.title on every route, season, or selected-item change (WCAG 2.4.2)
  useEffect(() => {
    if (selected) {
      document.title = `${selected.name} · ${viewTitles[kindToView[selected.kind]]} · 万象棋谱`;
      return;
    }
    if (location.view === 'home') {
      document.title = `万象棋谱 · 王者万象棋 ${seasonMeta.shortLabel} 资料库`;
      return;
    }
    document.title = `${viewTitles[location.view]} · ${seasonMeta.shortLabel} · 万象棋谱`;
  }, [location.view, seasonMeta.shortLabel, selected]);

  // Ensure initial URL has a valid season query (and promote ?view=...&item=... Toy share queries to hash)
  useEffect(() => {
    const current = readHash();
    if (!window.location.hash) {
      const nextParams = new URLSearchParams(current.params);
      if (!nextParams.get('season')) nextParams.set('season', seasonMeta.id);
      const targetView: View = current.view === 'not-found' ? 'home' : current.view;
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${makeHash(targetView, nextParams)}`,
      );
      return;
    }
    if (current.view !== 'not-found' && !current.params.get('season')) {
      current.params.set('season', seasonMeta.id);
      window.history.replaceState(null, '', makeHash(current.view, current.params));
    }
  }, [seasonMeta.id]);

  // Hash navigation listener:
  // - Only scrolls to top & runs View Transition when `view` or `season` actually changes (fixes P1-6)
  // - Shifts programmatic focus to the new view's <h1> after transition settles
  useEffect(() => {
    const focusHeading = () => {
      const heading = document.querySelector<HTMLElement>('#main-content main h1');
      heading?.focus({ preventScroll: true });
    };

    const onHash = () => {
      const next = readHash();
      const nextSeason = resolveSeasonMeta(next.params.get('season')).id;
      const viewChanged =
        next.view !== prevRouteRef.current.view || nextSeason !== prevRouteRef.current.season;

      prevRouteRef.current = { view: next.view, season: nextSeason };
      if (!next.params.get('item')) {
        openedItemInAppRef.current = false;
      }

      const applyState = () => {
        setLocation(next);
        setMenuOpen(false);
        setSearchOpen(false);
      };

      if (viewChanged) {
        hasNavigatedRef.current = true;
        if (typeof document.startViewTransition === 'function' && !prefersReducedMotion()) {
          const transition = document.startViewTransition(() => {
            flushSync(applyState);
          });
          transition.ready
            .then(() => window.scrollTo({ top: 0, behavior: 'instant' }))
            .catch(() => {});
          transition.finished.finally(() => {
            focusHeading();
          });
        } else {
          applyState();
          window.scrollTo({ top: 0, behavior: 'instant' });
          window.requestAnimationFrame(focusHeading);
        }
      } else {
        applyState();
      }
    };

    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Global search shortcuts (Cmd/Ctrl+K and `/` outside text inputs)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing =
        Boolean(target) &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target!.tagName) || target!.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      } else if (event.key === '/' && !editing && !selected && !menuOpen && !searchOpen) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, menuOpen, searchOpen]);

  const go = useCallback((view: View, params: Record<string, string> = {}, seasonId: string) => {
    const next = new URLSearchParams(params);
    next.set('season', seasonId);
    const nextHash = makeHash(view, next);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, []);

  const navigate = useCallback(
    (view: View, params?: Record<string, string>) => {
      go(view, params, seasonMeta.id);
    },
    [go, seasonMeta.id],
  );

  const switchSeason = useCallback(
    (seasonId: string) => {
      const targetView: View = location.view === 'not-found' ? 'home' : location.view;
      go(targetView, {}, seasonId);
    },
    [go, location.view],
  );

  const openItem = useCallback((item: CatalogItem) => {
    const current = readHash();
    const activeSeasonId = resolveSeasonMeta(current.params.get('season')).id;
    const nextHash = makeItemHash(item, activeSeasonId, current.view, current.params);
    setSearchOpen(false);
    openedItemInAppRef.current = true;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, []);

  // Fix P2-1: pop history when opened in-app so Back never reopens a closed drawer;
  // replaceState cleanly when landed directly via deep link.
  const closeItem = useCallback(() => {
    const current = readHash();
    if (!current.params.has('item')) return;

    if (openedItemInAppRef.current) {
      openedItemInAppRef.current = false;
      window.history.back();
      return;
    }

    current.params.delete('item');
    const targetView: View = current.view === 'not-found' ? 'home' : current.view;
    const nextHash = makeHash(targetView, current.params);
    window.history.replaceState(null, '', nextHash);
    setLocation(readHash(nextHash));
  }, []);

  const handleLinkNav = (event: React.MouseEvent<HTMLAnchorElement>, view: View) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    navigate(view);
  };

  const openShare = useCallback(
    (item?: CatalogItem) => {
      if (item) {
        const targetView = kindToView[item.kind];
        setShareTarget({
          title: `分享「${item.name}」档案`,
          subtitle: `${seasonMeta.label} · ${viewTitles[targetView]} · ${seasonMeta.currentPatch}`,
          sharePath: makeToySharePath(targetView, seasonMeta.id, item.id),
          fallbackUrl: window.location.href,
        });
        return;
      }
      const viewLabel = location.view === 'home' ? '万象棋谱' : viewTitles[location.view];
      setShareTarget({
        title: `分享${viewLabel}`,
        subtitle: `${seasonMeta.label} · ${seasonMeta.currentPatch} · 跨端扫码或分享给棋友`,
        sharePath: makeToySharePath(location.view, seasonMeta.id, selected?.id),
        fallbackUrl: window.location.href,
      });
    },
    [location.view, seasonMeta.currentPatch, seasonMeta.id, seasonMeta.label, selected?.id],
  );

  const isCatalog = location.view in catalogKind;

  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          const target =
            document.querySelector<HTMLElement>('#main-content main h1') ??
            document.getElementById('main-content');
          target?.focus();
          target?.scrollIntoView({ block: 'start' });
        }}
      >
        跳至主要内容
      </a>

      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href={makeHash('home', { season: seasonMeta.id })}
            onClick={(event) => handleLinkNav(event, 'home')}
          >
            <span className="brand-mark" aria-hidden="true">
              <i />
              <b>万</b>
            </span>
            <span className="brand-text">
              <strong>万象棋谱</strong>
              <small>WANXIANG ARCHIVE</small>
            </span>
          </a>

          <nav className="main-nav" aria-label="主要">
            <ul>
              {navItems.map((item) => (
                <li key={item.view}>
                  <a
                    href={makeHash(item.view, { season: seasonMeta.id })}
                    aria-current={location.view === item.view ? 'page' : undefined}
                    onClick={(event) => handleLinkNav(event, item.view)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-actions">
            <SeasonSwitcher
              seasons={seasonMetaEntries}
              currentId={seasonMeta.id}
              patch={seasonMeta.currentPatch}
              onSelect={switchSeason}
            />
            <button
              type="button"
              className="header-search"
              onClick={() => setSearchOpen(true)}
              aria-expanded={searchOpen}
            >
              <Search size={17} aria-hidden="true" />
              <span className="header-search-label">搜索档案</span>
              <kbd aria-hidden="true">⌘ K</kbd>
            </button>
            <button
              type="button"
              className="icon-button header-share"
              onClick={() => openShare()}
              aria-label="分享与跨端扫码"
            >
              <Share2 size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="mobile-menu icon-button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-dialog"
              aria-label="打开导航"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div id="main-content" className="app-main-wrap" tabIndex={-1}>
        {loadError ? (
          <main className="not-found-page page-shell">
            <span className="not-found-seal" aria-hidden="true">
              误
            </span>
            <h1 tabIndex={-1}>资料加载受阻</h1>
            <p>{loadError}</p>
            <button type="button" className="primary-button" onClick={() => window.location.reload()}>
              重新加载
            </button>
          </main>
        ) : location.view === 'not-found' ? (
          <main className="not-found-page page-shell">
            <span className="not-found-seal" aria-hidden="true">
              佚
            </span>
            <span className="eyebrow">404 / ARCHIVE NOT FOUND</span>
            <h1 tabIndex={-1}>未找到对应档案页</h1>
            <p>
              路径 <code>#/{location.rawPath}</code> 不在当前棋谱目录中，可能链接已过时或拼写有误。
            </p>
            <a
              className="primary-button"
              href={makeHash('home', { season: seasonMeta.id })}
              onClick={(event) => handleLinkNav(event, 'home')}
            >
              返回万象棋谱首页
            </a>
          </main>
        ) : !activeSeason ? (
          <main className="view-loading page-shell" aria-busy="true">
            <span className="eyebrow">LOADING ARCHIVE</span>
            <p>正在展开 {seasonMeta.label} 档案…</p>
          </main>
        ) : (
          <Suspense
            fallback={
              <main className="view-loading page-shell" aria-busy="true">
                <span className="eyebrow">LOADING VIEW</span>
                <p>正在加载页面…</p>
              </main>
            }
          >
            {location.view === 'home' && (
              <Home
                season={activeSeason}
                onNavigate={navigate}
                onSelect={openItem}
                onSearch={() => setSearchOpen(true)}
              />
            )}
            {isCatalog && (
              <CatalogView
                key={`${activeSeason.meta.id}-${location.view}`}
                season={activeSeason}
                view={location.view as 'heroes'}
                items={activeSeason.dataByKind[catalogKind[location.view]]}
                params={location.params}
                favoriteIds={favorites.favoriteIds}
                favoriteSyncMode={favorites.syncMode}
                syncNotice={favorites.syncNotice}
                onSelect={openItem}
              />
            )}
            {location.view === 'mechanics' && <Mechanics season={activeSeason} />}
            {location.view === 'sources' && <Sources season={activeSeason} onNavigate={navigate} />}
          </Suspense>
        )}
      </div>

      <footer className="site-footer">
        <div className="page-shell">
          <div className="footer-brand">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <b>万</b>
            </span>
            <div>
              <strong>万象棋谱</strong>
              <p>非官方玩家资料站 · 游戏素材与名称权利归原权利人所有</p>
            </div>
          </div>
          <div className="footer-links">
            <a href="https://wxq.qq.com/" target="_blank" rel="noreferrer">
              游戏官网
            </a>
            <a href="https://wxq.qq.com/cp/a202609xszy/" target="_blank" rel="noreferrer">
              官方新手指引
            </a>
            <a
              href={makeHash('sources', { season: seasonMeta.id })}
              onClick={(event) => handleLinkNav(event, 'sources')}
            >
              来源与免责声明
            </a>
          </div>
          <div className="footer-bottom">
            <span>
              {seasonMeta.label} · 核验至 {seasonMeta.verifiedAt}
            </span>
            <span>正式服赛季独立归档 · 不收录体验服测试集</span>
          </div>
        </div>
      </footer>

      {menuOpen && (
        <MobileNavDialog
          id="mobile-nav-dialog"
          items={navItems}
          currentView={location.view}
          seasonMeta={seasonMeta}
          onNavigate={navigate}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {searchOpen && activeSeason && (
        <Suspense fallback={null}>
          <GlobalSearch
            season={activeSeason}
            onClose={() => setSearchOpen(false)}
            onSelect={openItem}
          />
        </Suspense>
      )}

      {selected && activeSeason && (
        <Suspense fallback={null}>
          <DetailDrawer
            key={`${activeSeason.meta.id}-${selected.id}`}
            item={selected}
            verifiedAt={activeSeason.meta.verifiedAt}
            favorited={favorites.isFavorite(selected.id)}
            syncMode={favorites.syncMode}
            syncNotice={favorites.syncNotice}
            onToggleFavorite={() => favorites.toggleFavorite(selected.id)}
            onShare={() => openShare(selected)}
            onClose={closeItem}
          />
        </Suspense>
      )}

      {shareTarget && (
        <Suspense fallback={null}>
          <ShareModal
            title={shareTarget.title}
            subtitle={shareTarget.subtitle}
            sharePath={shareTarget.sharePath}
            fallbackUrl={shareTarget.fallbackUrl}
            onClose={() => setShareTarget(null)}
          />
        </Suspense>
      )}
    </>
  );
}
