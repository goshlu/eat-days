import { describe, expect, it } from 'vitest';
import { getAffiliateClickKey, getMeituanUnionSearchUrl } from '@/lib/affiliate';

describe('affiliate helpers', () => {
  it('builds a Meituan union search URL from a takeout keyword', () => {
    const url = getMeituanUnionSearchUrl('小碗菜·回锅肉套餐');

    expect(url).toContain('https://union.meituan.com/search');
    expect(url).toContain('keyword=');
    expect(new URL(url).searchParams.get('keyword')).toBe('小碗菜·回锅肉套餐');
  });

  it('normalizes click counter keys', () => {
    expect(getAffiliateClickKey(' 重庆小面 ')).toBe('affiliate:meituan:clicks:重庆小面');
  });
});
