import type { UrlFilter } from './types.ts';

export function filteredUrl(filter: UrlFilter, href: string): string | null {
  const url = new URL(href);
  if (!url.pathname.startsWith(filter.pathPrefix)) return null;
  if (url.searchParams.has(filter.param)) return null;
  const pair = `${encodeURIComponent(filter.param)}=${encodeURIComponent(filter.value)}`;
  const search = url.search ? `${url.search}&${pair}` : `?${pair}`;
  return `${url.origin}${url.pathname}${search}${url.hash}`;
}
