import type { Rule, ShadowRule } from './types.ts';

export function start(rule: Rule): void {
  const hidden = [rule.hide, rule.shadow && '[data-never-market]'].filter(Boolean).join(',');
  if (hidden) {
    const style = document.createElement('style');
    style.textContent = `${hidden}{display:none!important}`;
    document.documentElement.append(style);
  }
  if (rule.shadow) startShadowScan(rule.shadow);
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
