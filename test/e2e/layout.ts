import type { Page } from '@playwright/test';

export function layoutProblems(page: Page, containerSelector: string): Promise<string[]> {
  return page.evaluate((selector) => {
    const container = document.querySelector(selector);
    if (!container) return [`no container ${selector}`];
    const problems: string[] = [];
    const boxes = [...container.children]
      .filter((child) => child.getClientRects().length)
      .map((child) => ({ name: child.textContent?.trim().slice(0, 20) ?? '', rect: child.getBoundingClientRect() }));

    for (const { name, rect } of boxes) {
      if (!rect.width || !rect.height) problems.push(`empty box: ${name}`);
    }

    const rows = new Map<number, typeof boxes>();
    for (const box of boxes) rows.set(Math.round(box.rect.top), [...(rows.get(Math.round(box.rect.top)) ?? []), box]);

    const containerLeft = container.getBoundingClientRect().left;
    for (const row of rows.values()) {
      const sorted = row.sort((a, b) => a.rect.left - b.rect.left);
      const [first] = sorted;
      if (!first) continue;
      if (first.rect.left - containerLeft > first.rect.width) problems.push(`row starts late: ${first.name}`);
      sorted.slice(1).forEach((box, i) => {
        const prev = sorted[i];
        if (prev && box.rect.left - prev.rect.right > prev.rect.width) problems.push(`gap before: ${box.name}`);
      });
    }
    return problems;
  }, containerSelector);
}
