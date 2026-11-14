import type { UrlFilter } from './types.ts';

const matchesPath = (filter: UrlFilter, pathname: string): boolean =>
  [filter.pathPrefix].flat().some((prefix) => pathname.startsWith(prefix));

export function filteredUrl(filter: UrlFilter, href: string): string | null {
  const url = new URL(href);
  if (!matchesPath(filter, url.pathname)) return null;
  if (url.searchParams.has(filter.param)) return null;
  const pair = `${encodeURIComponent(filter.param)}=${encodeURIComponent(filter.value)}`;
  const search = url.search ? `${url.search}&${pair}` : `?${pair}`;
  return `${url.origin}${url.pathname}${search}${url.hash}`;
}

export function hasFilterParam(filter: UrlFilter, href: string): boolean {
  const url = new URL(href);
  return matchesPath(filter, url.pathname) && url.searchParams.has(filter.param);
}
