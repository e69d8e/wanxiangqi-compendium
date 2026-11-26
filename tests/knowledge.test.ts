import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { seasons } from '../src/data';

const statusLabels = {
  live: '正式服',
  archive: '归档',
  test: '测试',
} as const;

const kindOrder = ['hero', 'player', 'talent', 'equipment', 'effect'] as const;

type Row = string[];

function readSeasonRows(): Row[] {
  const markdown = readFileSync(resolve(process.cwd(), 'WANXIANGQI.md'), 'utf8');
  const block = markdown.match(
    /<!-- AUTO:SEASONS:START -->\s*([\s\S]*?)<!-- AUTO:SEASONS:END -->/,
  );
  if (!block) throw new Error('WANXIANGQI.md 缺少 AUTO:SEASONS 标记块');

  return block[1]
    .trim()
    .split('\n')
    .slice(2)
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim()),
    );
}

describe('知识库与数据一致性', () => {
  it('每个赛季在 WANXIANGQI.md 中有一行且与 meta 一致', () => {
    const rows = readSeasonRows();
    expect(rows).toHaveLength(seasons.length);

    for (const season of seasons) {
      const { meta } = season;
      const row = rows.find((entry) => entry[0] === meta.shortLabel);
      expect(row, meta.id).toBeTruthy();
      if (!row) continue;

      expect(row[1], meta.id).toBe(statusLabels[meta.status]);
      expect(row[2], meta.id).toBe(meta.currentPatch);
      expect(row[3], meta.id).toBe(meta.patchDate);
      expect(row[4], meta.id).toBe(meta.verifiedAt);
      expect(row[5], meta.id).toBe(`${meta.totalCount} / ${meta.currentCount}`);

      kindOrder.forEach((kind, index) => {
        const counts = meta.categories[kind];
        expect(row[6 + index], `${meta.id}/${kind}`).toBe(
          `${counts.totalCount} / ${counts.currentCount}`,
        );
      });
    }
  });

  it('知识库保留更新约定与公告边界', () => {
    const markdown = readFileSync(resolve(process.cwd(), 'WANXIANGQI.md'), 'utf8');
    expect(markdown).toContain('每次数据或版本变化后必须同步更新本文件');
    expect(markdown).toContain('体验服');
    expect(markdown).toContain('不猜');
  });
});