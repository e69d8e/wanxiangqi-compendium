import type { CatalogItem, Kind, View } from '../types';

export const validViews = new Set<View>([
  'home',
  'heroes',
  'players',
  'talents',
  'equipment',
  'effects',
  'mechanics',
  'sources',
]);

export const kindToView: Record<Kind, View> = {
  hero: 'heroes',
  player: 'players',
  talent: 'talents',
  equipment: 'equipment',
  effect: 'effects',
};

export interface HashLocation {
  view: View | 'not-found';
  params: URLSearchParams;
  rawPath: string;
}

export function readHash(
  hashValue = window.location.hash,
  searchValue = typeof window !== 'undefined' ? window.location.search : '',
): HashLocation {
  const raw = hashValue.replace(/^#\/?/, '');
  if (!raw && searchValue) {
    const queryParams = new URLSearchParams(searchValue);
    const queryView = queryParams.get('view');
    const queryItem = queryParams.get('item');
    if (queryView || queryItem) {
      const candidate = (queryView || 'home') as View;
      const params = new URLSearchParams(queryParams);
      params.delete('view');
      return {
        view: validViews.has(candidate) ? candidate : 'not-found',
        params,
        rawPath: queryView ?? '',
      };
    }
  }

  const [path = '', query = ''] = raw.split('?');
  const normalizedPath = path.replace(/\/+$/, '');
  const candidate = (normalizedPath || 'home') as View;

  return {
    view: validViews.has(candidate) ? candidate : 'not-found',
    params: new URLSearchParams(query),
    rawPath: normalizedPath,
  };
}

/**
 * Builds a relative path suitable for Bilibili Toy `toy.share({ path })` and
 * `toy.getQrCode({ path })` (relative to `/toy/<slug>/`, using query parameters
 * rather than absolute URLs or parent traversal).
 */
export function makeToySharePath(view: View | 'not-found', seasonId: string, itemId?: string): string {
  const targetView: View = view === 'not-found' ? 'home' : view;
  const params = new URLSearchParams();
  if (targetView !== 'home') params.set('view', targetView);
  if (seasonId) params.set('season', seasonId);
  if (itemId) params.set('item', itemId);
  const query = params.toString();
  return query ? `index.html?${query}` : 'index.html';
}

export function makeHash(view: View, params?: URLSearchParams | Record<string, string>) {
  const search = params instanceof URLSearchParams
    ? params
    : new URLSearchParams(params);
  const query = search.toString();
  return `#/${view}${query ? `?${query}` : ''}`;
}

export function makeItemHash(
  item: CatalogItem,
  seasonId: string,
  currentView?: View | 'not-found',
  currentParams?: URLSearchParams,
) {
  const targetView = kindToView[item.kind];
  const params = currentView === targetView && currentParams
    ? new URLSearchParams(currentParams)
    : new URLSearchParams();
  params.set('season', seasonId);
  params.set('item', item.id);
  return makeHash(targetView, params);
}

export function updateHash(view: View, params: URLSearchParams) {
  const next = makeHash(view, params);
  if (window.location.hash !== next) window.location.hash = next;
}
