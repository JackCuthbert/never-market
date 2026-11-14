import test from 'node:test';
import assert from 'node:assert';
import { filteredUrl, hasFilterParam } from '../../src/url-filter.ts';

const bunnings = { pathPrefix: '/search/products', param: 'productranges', value: '!Marketplace' };
const base = 'https://www.bunnings.com.au';

test('appends the param to a matching path', () => {
  assert.strictEqual(
    filteredUrl(bunnings, `${base}/search/products?page=1&q=cable+management&sort=BoostOrder`),
    `${base}/search/products?page=1&q=cable+management&sort=BoostOrder&productranges=!Marketplace`
  );
});

test('adds ? when there is no query', () => {
  assert.strictEqual(
    filteredUrl(bunnings, `${base}/search/products`),
    `${base}/search/products?productranges=!Marketplace`
  );
});

test('keeps the hash', () => {
  assert.strictEqual(
    filteredUrl(bunnings, `${base}/search/products?q=a#top`),
    `${base}/search/products?q=a&productranges=!Marketplace#top`
  );
});

test('returns null when the param is present with any value', () => {
  assert.strictEqual(filteredUrl(bunnings, `${base}/search/products?productranges=!Marketplace`), null);
  assert.strictEqual(filteredUrl(bunnings, `${base}/search/products?productranges=Other`), null);
});

test('returns null when the path does not match', () => {
  assert.strictEqual(filteredUrl(bunnings, `${base}/p/123`), null);
  assert.strictEqual(filteredUrl(bunnings, `${base}/`), null);
});

test('encodes with %20', () => {
  const jb = { pathPrefix: '/search', param: 'Sold by', value: 'JB Hi-Fi' };
  assert.strictEqual(
    filteredUrl(jb, 'https://www.jbhifi.com.au/search?query=phone%20case'),
    'https://www.jbhifi.com.au/search?query=phone%20case&Sold%20by=JB%20Hi-Fi'
  );
});

test('detects a param written with +', () => {
  const jb = { pathPrefix: '/search', param: 'Sold by', value: 'JB Hi-Fi' };
  assert.strictEqual(filteredUrl(jb, 'https://www.jbhifi.com.au/search?Sold+by=Other'), null);
});

test('hasFilterParam is true only on a matching path that carries the param', () => {
  assert.strictEqual(hasFilterParam(bunnings, `${base}/search/products?productranges=Other`), true);
  assert.strictEqual(hasFilterParam(bunnings, `${base}/search/products?q=a`), false);
  assert.strictEqual(hasFilterParam(bunnings, `${base}/p/1?productranges=!Marketplace`), false);
});

test('a pathPrefix list matches any prefix', () => {
  const filter = { pathPrefix: ['/search/products', '/products/'], param: 'productranges', value: '!Marketplace' };
  assert.strictEqual(
    filteredUrl(filter, `${base}/products/assisted-living/bathroom-safety?page=1#top`),
    `${base}/products/assisted-living/bathroom-safety?page=1&productranges=!Marketplace#top`,
  );
  assert.strictEqual(filteredUrl(filter, `${base}/search/products?q=a`), `${base}/search/products?q=a&productranges=!Marketplace`);
  assert.strictEqual(filteredUrl(filter, `${base}/products/x?productranges=Other`), null);
  assert.strictEqual(filteredUrl(filter, `${base}/walking-frame_p0123456`), null);
  assert.strictEqual(filteredUrl(filter, `${base}/`), null);
  assert.strictEqual(hasFilterParam(filter, `${base}/products/x?productranges=!Marketplace`), true);
});
