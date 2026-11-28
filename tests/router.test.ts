import { describe, expect, it } from 'vitest';
import { makeHash, makeItemHash, makeToySharePath, readHash } from '../src/lib/router';
import { itemById } from '../src/data';

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

  it('保留赛季查询参数', () => {
    expect(makeHash('heroes', { season: 's1', filter: '河洛' })).toBe(
      '#/heroes?season=s1&filter=%E6%B2%B3%E6%B4%9B',
    );
  });

  it('readHash 正确解析空路径、合法视图与未知路由', () => {
    expect(readHash('').view).toBe('home');
    expect(readHash('#/').view).toBe('home');
    expect(readHash('#/heroes?season=s1&filter=%E6%B2%B3%E6%B4%9B').view).toBe('heroes');
    expect(readHash('#/heroes?season=s1&filter=%E6%B2%B3%E6%B4%9B').params.get('filter')).toBe('河洛');
    const unknown = readHash('#/not-a-view?season=s1');
    expect(unknown.view).toBe('not-found');
    expect(unknown.rawPath).toBe('not-a-view');
  });

  it('makeItemHash 保留同视图筛选条件并在跨视图时切换目标分类', () => {
    const hero = itemById.get('hero-sunbin')!;
    const sameView = makeItemHash(hero, 's1', 'heroes', new URLSearchParams({ filter: '河洛' }));
    expect(sameView).toBe('#/heroes?filter=%E6%B2%B3%E6%B4%9B&season=s1&item=hero-sunbin');

    const crossView = makeItemHash(hero, 's1', 'home', new URLSearchParams({ season: 's1' }));
    expect(crossView).toBe('#/heroes?season=s1&item=hero-sunbin');
  });

  it('readHash 支持 Toy 分享 query 深链回落', () => {
    const fromQuery = readHash('', '?view=heroes&season=s1&item=hero-sunbin');
    expect(fromQuery.view).toBe('heroes');
    expect(fromQuery.params.get('season')).toBe('s1');
    expect(fromQuery.params.get('item')).toBe('hero-sunbin');
    expect(fromQuery.params.has('view')).toBe(false);
  });

  it('makeToySharePath 输出合法的相对路径且不含越界前缀', () => {
    expect(makeToySharePath('home', 's1')).toBe('index.html?season=s1');
    expect(makeToySharePath('heroes', 's1', 'hero-sunbin')).toBe(
      'index.html?view=heroes&season=s1&item=hero-sunbin',
    );
    expect(makeToySharePath('not-found', 's1')).toBe('index.html?season=s1');
  });
});
