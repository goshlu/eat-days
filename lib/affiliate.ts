const DEFAULT_MEITUAN_UNION_SEARCH_URL = 'https://union.meituan.com/search';

export function getMeituanUnionSearchUrl(keyword: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_MEITUAN_UNION_SEARCH_URL || DEFAULT_MEITUAN_UNION_SEARCH_URL;
  const url = new URL(baseUrl);
  url.searchParams.set('keyword', keyword.trim());

  return url.toString();
}

export function getAffiliateClickKey(keyword: string): string {
  return `affiliate:meituan:clicks:${keyword.trim().toLowerCase()}`;
}
