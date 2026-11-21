import { describe, expect, it } from 'vitest';
import { makeHash } from '../src/lib/router';

describe('hash 路由', () => {
  it('无参数时输出视图路径', () => {
    expect(makeHash('home')).toBe('#/home');
  });

  it('参数会被正确编码', () => {
    expect(makeHash('heroes', { filter: '河洛', layout: 'list' })).toBe(
      '#/heroes?filter=%E6%B2%B3%E6%B4%9B&layout=list',
    );
  });

  it('接受 URLSearchParams', () => {
    expect(makeHash('players', new URLSearchParams({ item: 'player-22' }))).toBe('#/players?item=player-22');
  });
});
