import type { Rule } from './types.ts';

export function start(rule: Rule): void {
  if (rule.hide) {
    const style = document.createElement('style');
    style.textContent = `${rule.hide}{display:none!important}`;
    document.documentElement.append(style);
  }
}
