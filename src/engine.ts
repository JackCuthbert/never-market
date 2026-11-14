import { isCountRequest } from './types.ts';
import type { CountResponse, KeepRule, Rule, ShadowRule, StatusMessage, UrlFilter } from './types.ts';
import { filteredUrl, hasFilterParam, unfilteredUrl } from './url-filter.ts';

const ENABLED_KEY = 'enabled';
const FILTERS_KEY = 'useStoreFilters';
const REDIRECT_KEY = 'never-market-redirect';

type Settings = { enabled: boolean; useStoreFilters: boolean };

export function start(rule: Rule): void {
  const settings = { loaded: false, enabled: true, useStoreFilters: true };
  const style = createStyle(rule);
  const scanner = rule.shadow
    ? createShadowScanner(rule.shadow)
    : rule.keep && rule.card
      ? createKeepScanner(rule.card, rule.keep)
      : undefined;
  const redirect = rule.urlFilter && createRedirect(rule.urlFilter, () => settings.loaded && settings.enabled && settings.useStoreFilters);

  const report = (): void => {
    const message: StatusMessage = { type: 'status', active: settings.enabled };
    chrome.runtime.sendMessage(message).catch(() => {});
  };

  const apply = (): void => {
    if (settings.enabled) document.documentElement.append(...(style ? [style] : []));
    else style?.remove();
    scanner?.setActive(settings.enabled);
    redirect?.();
  };

  addEventListener('pageshow', report);
  apply();
  void chrome.storage.local.get([ENABLED_KEY, FILTERS_KEY]).then((stored) => {
    settings.loaded = true;
    settings.enabled = stored[ENABLED_KEY] !== false;
    settings.useStoreFilters = stored[FILTERS_KEY] !== false;
    apply();
    report();
  });
  chrome.storage.onChanged.addListener((changes) => {
    const enabled = changes[ENABLED_KEY];
    const filters = changes[FILTERS_KEY];
    if (enabled) settings.enabled = enabled.newValue !== false;
    if (filters) settings.useStoreFilters = filters.newValue !== false;
    apply();
    const turnedOff = (enabled && !settings.enabled) || (filters && !settings.useStoreFilters);
    const cleaned = turnedOff && rule.urlFilter && unfilteredUrl(rule.urlFilter, location.href);
    if (cleaned) location.replace(cleaned);
    if (enabled) report();
  });
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse: (response: CountResponse) => void) => {
    if (isCountRequest(message)) sendResponse(countListings(rule, settings));
  });
  // shortcut: polling, replace with webNavigation if 500 ms lag is not acceptable
  setInterval(() => redirect?.(), 500);
}

function countListings(rule: Rule, settings: Settings): CountResponse {
  const hiddenSelector = rule.hide ?? (rule.shadow && '[data-never-market]') ?? (rule.keep && rule.card && notKept(rule.card));
  const cardSelector = rule.card ?? rule.shadow?.card;
  return {
    store: rule.name,
    hidden: settings.enabled && hiddenSelector ? document.querySelectorAll(hiddenSelector).length : 0,
    filterable: Boolean(rule.urlFilter),
    note: rule.note ?? null,
    total: cardSelector ? document.querySelectorAll(cardSelector).length : null,
    filtered: Boolean(
      rule.urlFilter && settings.enabled && settings.useStoreFilters && hasFilterParam(rule.urlFilter, location.href),
    ),
  };
}

const KEEP_ATTRIBUTE = 'data-never-market-keep';
const notKept = (card: string): string => `:is(${card}):not([${KEEP_ATTRIBUTE}])`;

function createStyle(rule: Rule): HTMLStyleElement | undefined {
  const hidden = [rule.hide, rule.shadow && '[data-never-market]', rule.keep && rule.card && notKept(rule.card)]
    .filter(Boolean)
    .join(',');
  if (!hidden) return undefined;
  const style = document.createElement('style');
  style.textContent = `${hidden}{display:none!important}`;
  return style;
}

function createRedirect(filter: UrlFilter, allowed: () => boolean): () => void {
  return () => {
    if (!allowed()) return;
    const target = filteredUrl(filter, location.href);
    if (!target) return;
    const last = sessionStorage.getItem(REDIRECT_KEY);
    if (last?.startsWith(`${target}|`) && Date.now() - Number(last.slice(target.length + 1)) < 5000) return;
    sessionStorage.setItem(REDIRECT_KEY, `${target}|${Date.now()}`);
    location.replace(target);
  };
}

function createShadowScanner({ card, host, marketplace }: ShadowRule): { setActive(active: boolean): void } {
  let observed = new WeakSet<ShadowRoot>();
  let queued = false;
  let timer: number | undefined;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  });

  function scan(): void {
    for (const cell of document.querySelectorAll(card)) {
      const root = cell.querySelector(host)?.shadowRoot;
      if (root && !observed.has(root)) {
        observed.add(root);
        observer.observe(root, { childList: true, subtree: true });
      }
      cell.toggleAttribute('data-never-market', Boolean(root?.querySelector(marketplace)));
    }
  }

  return {
    setActive(active) {
      observer.disconnect();
      clearInterval(timer);
      timer = undefined;
      observed = new WeakSet();
      if (active) {
        observer.observe(document, { childList: true, subtree: true });
        timer = setInterval(scan, 500);
        scan();
      } else {
        for (const cell of document.querySelectorAll(card)) cell.removeAttribute('data-never-market');
      }
    },
  };
}

function createKeepScanner(card: string, { badge, text }: KeepRule): { setActive(active: boolean): void } {
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  });

  function scan(): void {
    for (const cell of document.querySelectorAll(card)) {
      const kept = [...cell.querySelectorAll(badge)].some((el) => el.textContent?.trim() === text);
      cell.toggleAttribute(KEEP_ATTRIBUTE, kept);
    }
  }

  return {
    setActive(active) {
      observer.disconnect();
      if (active) {
        observer.observe(document, { childList: true, subtree: true, characterData: true });
        scan();
      } else {
        for (const cell of document.querySelectorAll(card)) cell.removeAttribute(KEEP_ATTRIBUTE);
      }
    },
  };
}
