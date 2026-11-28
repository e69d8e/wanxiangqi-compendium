import { describe, expect, it } from 'vitest';
import {
  isSafeToyRelativePath,
  isToyRateLimitError,
  TOY_RATE_LIMIT_CODE,
} from '../src/lib/toySdk';
import {
  parseFavoritePayload,
  serializeFavoritePayload,
  utf8ByteLength,
} from '../src/lib/useFavorites';

describe('Toy SDK 辅助与云收藏校验', () => {
  it('校验相对分享路径，拒绝绝对路径与父目录越界', () => {
    expect(isSafeToyRelativePath('index.html')).toBe(true);
    expect(isSafeToyRelativePath('index.html?view=heroes&season=s1&item=hero-sunbin')).toBe(true);
    expect(isSafeToyRelativePath('/index.html')).toBe(false);
    expect(isSafeToyRelativePath('../other-toy/index.html')).toBe(false);
    expect(isSafeToyRelativePath('https://www.bilibili.com/toy/x/index.html')).toBe(false);
  });

  it('准确识别 307044 频率限制错误', () => {
    expect(isToyRateLimitError({ type: 'http_error', code: TOY_RATE_LIMIT_CODE })).toBe(true);
    expect(isToyRateLimitError({ type: 'http_error', code: '307044' })).toBe(true);
    expect(isToyRateLimitError({ type: 'http_error', code: 500 })).toBe(false);
    expect(isToyRateLimitError({ type: 'not_logged_in', code: 307044 })).toBe(false);
    expect(isToyRateLimitError(null)).toBe(false);
  });

  it('云收藏序列化严格受控在 1024 字节以内并自动去重', () => {
    expect(parseFavoritePayload('["hero-sunbin","hero-yao","hero-sunbin",123,""]')).toEqual([
      'hero-sunbin',
      'hero-yao',
    ]);
    expect(parseFavoritePayload('not-json')).toEqual([]);

    const compact = serializeFavoritePayload(['hero-sunbin', 'hero-yao']);
    expect(compact).toBe('["hero-sunbin","hero-yao"]');
    expect(utf8ByteLength(compact!)).toBeLessThanOrEqual(1024);

    const tooMany = Array.from({ length: 120 }, (_, i) => `talent-long-id-${i}`);
    expect(serializeFavoritePayload(tooMany)).toBeNull();
  });
});
