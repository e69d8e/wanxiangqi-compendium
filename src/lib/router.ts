import type { View } from '../types';

const views = new Set<View>(['home', 'heroes', 'players', 'talents', 'equipment', 'effects', 'mechanics', 'sources']);

export function readHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  const candidate = (path || 'home') as View;
  return {
    view: views.has(candidate) ? candidate : 'home' as View,
    params: new URLSearchParams(query),
  };
}

export function makeHash(view: View, params?: URLSearchParams | Record<string, string>) {
  const search = params instanceof URLSearchParams
    ? params
    : new URLSearchParams(params);
  const query = search.toString();
  return `#/${view}${query ? `?${query}` : ''}`;
}

export function updateHash(view: View, params: URLSearchParams) {
  const next = makeHash(view, params);
  if (window.location.hash !== next) window.location.hash = next;
}
