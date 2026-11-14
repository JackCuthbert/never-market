import test from 'node:test';
import assert from 'node:assert';
import { filteredUrl, hasFilterParam, unfilteredUrl } from '../../src/url-filter.ts';

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

test('unfilteredUrl removes the param and keeps the other params in order', () => {
  assert.strictEqual(
    unfilteredUrl(bunnings, `${base}/search/products?page=1&productranges=!Marketplace&q=cable+management`),
    `${base}/search/products?page=1&q=cable+management`
  );
});

test('unfilteredUrl keeps a param with a different value', () => {
  assert.strictEqual(unfilteredUrl(bunnings, `${base}/search/products?productranges=Other`), null);
});

test('unfilteredUrl keeps the hash', () => {
  assert.strictEqual(
    unfilteredUrl(bunnings, `${base}/search/products?q=a&productranges=!Marketplace#top`),
    `${base}/search/products?q=a#top`
  );
});

test('unfilteredUrl drops the ? when no params remain', () => {
  assert.strictEqual(
    unfilteredUrl(bunnings, `${base}/search/products?productranges=!Marketplace#top`),
    `${base}/search/products#top`
  );
});

test('unfilteredUrl matches encoded names and values and keeps other encodings', () => {
  const jb = { pathPrefix: '/search', param: 'Sold by', value: 'JB Hi-Fi' };
  const jbBase = 'https://www.jbhifi.com.au';
  assert.strictEqual(
    unfilteredUrl(jb, `${jbBase}/search?query=phone%20case&Sold%20by=JB%20Hi-Fi`),
    `${jbBase}/search?query=phone%20case`
  );
  assert.strictEqual(
    unfilteredUrl(jb, `${jbBase}/search?Sold+by=JB+Hi-Fi&query=a+b`),
    `${jbBase}/search?query=a+b`
  );
});

test('unfilteredUrl returns null when there is nothing to remove', () => {
  assert.strictEqual(unfilteredUrl(bunnings, `${base}/search/products?q=a`), null);
  assert.strictEqual(unfilteredUrl(bunnings, `${base}/search/products`), null);
  assert.strictEqual(unfilteredUrl(bunnings, `${base}/p/1?productranges=!Marketplace`), null);
});

test('unfilteredUrl handles an array pathPrefix', () => {
  const multi = { ...bunnings, pathPrefix: ['/search/products', '/products/'] };
  assert.strictEqual(
    unfilteredUrl(multi, `${base}/products/assisted-living?productranges=!Marketplace`),
    `${base}/products/assisted-living`
  );
});
