import type { Rule, ShadowRule } from './types.ts';
import { filteredUrl } from './url-filter.ts';

const TOGGLE_KEY = 'useStoreFilters';
const REDIRECT_KEY = 'never-market-redirect';

export function start(rule: Rule): void {
  const hidden = [rule.hide, rule.shadow && '[data-never-market]'].filter(Boolean).join(',');
  if (hidden) {
    const style = document.createElement('style');
    style.textContent = `${hidden}{display:none!important}`;
    document.documentElement.append(style);
  }
  if (rule.shadow) startShadowScan(rule.shadow);
  if (rule.urlFilter) startUrlFilter(rule.urlFilter);
}

function startUrlFilter(filter: NonNullable<Rule['urlFilter']>): void {
  let enabled = false;
  const redirect = (): void => {
    if (!enabled) return;
    const target = filteredUrl(filter, location.href);
    if (!target) return;
    const last = sessionStorage.getItem(REDIRECT_KEY);
    if (last && last.startsWith(`${target}|`) && Date.now() - Number(last.slice(target.length + 1)) < 5000) return;
    sessionStorage.setItem(REDIRECT_KEY, `${target}|${Date.now()}`);
    location.replace(target);
  };

  void chrome.storage.local.get(TOGGLE_KEY).then((stored) => {
    enabled = stored[TOGGLE_KEY] !== false;
    redirect();
  });
  chrome.storage.onChanged.addListener((changes) => {
    const change = changes[TOGGLE_KEY];
    if (change) enabled = change.newValue !== false;
    redirect();
  });
  // shortcut: polling, replace with webNavigation if 500 ms lag is not acceptable
  setInterval(redirect, 500);
}

function startShadowScan({ card, host, marketplace }: ShadowRule): void {
  const observed = new WeakSet<ShadowRoot>();
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
      const root = cell.querySelector(host)?.shadowRoot;
      if (root && !observed.has(root)) {
        observed.add(root);
        observer.observe(root, { childList: true, subtree: true });
      }
      cell.toggleAttribute('data-never-market', Boolean(root?.querySelector(marketplace)));
    }
  }

  observer.observe(document, { childList: true, subtree: true });
  setInterval(scan, 500);
  scan();
}
