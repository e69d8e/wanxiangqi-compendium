import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SeasonSwitcher } from '../src/components/SeasonSwitcher';
import { seasons } from '../src/data';
import type { SeasonDataset, SeasonMeta } from '../src/types';

function withMeta(season: SeasonDataset, meta: Partial<SeasonMeta>): SeasonDataset {
  return { ...season, meta: { ...season.meta, ...meta } };
}

describe('赛季切换器', () => {
  it('单赛季只显示版本，不显示多余按钮', () => {
    const html = renderToStaticMarkup(
      <SeasonSwitcher seasons={[seasons[0]]} currentId="s1" patch="v1.11.1" onSelect={() => {}} />,
    );
    expect(html).toContain('header-version');
    expect(html).toContain('S1');
    expect(html).toContain('v1.11.1');
    expect(html).not.toContain('season-switcher');
  });

  it('多赛季渲染按钮并标记当前赛季', () => {
    const second = withMeta(seasons[0], {
      id: 's2',
      label: 'S2 正式服',
      shortLabel: 'S2',
      order: 2,
    });
    const html = renderToStaticMarkup(
      <SeasonSwitcher
        seasons={[seasons[0], second]}
        currentId="s2"
        patch="v2.0.0"
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('aria-label="切换赛季"');
    expect(html).toContain('title="S1 正式服"');
    expect(html).toContain('title="S2 正式服"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('v2.0.0');
  });
});
