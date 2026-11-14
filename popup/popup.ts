import type { CountRequest, CountResponse } from '../src/types.ts';

type StoreInfo = { name: string };

const query = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selector} missing`);
  return element;
};

const main = query<HTMLElement>('main');
const store = query<HTMLElement>('#store');
const fill = query<HTMLElement>('#fill');
const percent = query<HTMLElement>('#percent');
const stats = query<HTMLElement>('#stats');
const extra = query<HTMLElement>('#extra');
const filtersRow = query<HTMLElement>('#filters-row');
const note = query<HTMLElement>('#note');
const storeList = query<HTMLElement>('#store-list');
const switches = {
  enabled: query<HTMLInputElement>('#enabled'),
  useStoreFilters: query<HTMLInputElement>('#use-store-filters'),
};

for (const [key, checkbox] of Object.entries(switches)) {
  checkbox.addEventListener('change', () => {
    void chrome.storage.local.set({ [key]: checkbox.checked });
  });
}

async function readCount(): Promise<CountResponse | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) return null;
    const request: CountRequest = { type: 'count' };
    return (await chrome.tabs.sendMessage<CountRequest, CountResponse | undefined>(tab.id, request)) ?? null;
  } catch {
    return null;
  }
}

function render(enabled: boolean, response: CountResponse | null): void {
  extra.hidden = true;
  filtersRow.hidden = response?.filterable === false;
  note.hidden = !response?.note;
  note.textContent = response?.note ?? '';
  if (!response) {
    main.dataset['state'] = 'unsupported';
    store.textContent = '';
    return;
  }
  const { hidden, total, filtered } = response;
  store.textContent = response.store;
  if (filtered) {
    main.dataset['state'] = 'filtered';
    stats.textContent = 'Store filter on. Listings are removed by the store, so there is nothing to count here.';
    extra.hidden = hidden === 0;
    extra.textContent = `${hidden} more hidden by the extension`;
    return;
  }
  if (!enabled) {
    main.dataset['state'] = 'off';
    stats.textContent = total === null ? 'Hiding is off.' : `Hiding is off. ${total} listings shown.`;
    return;
  }
  main.dataset['state'] = 'on';
  const share = total ? Math.round((hidden / total) * 100) : 0;
  stats.textContent = total ? `${hidden} of ${total} listings hidden` : 'No listings found yet';
  percent.textContent = total ? `${share}%` : '';
  fill.style.width = `${share}%`;
}

async function refresh(): Promise<void> {
  const [stored, response] = await Promise.all([
    chrome.storage.local.get(Object.keys(switches)),
    readCount(),
  ]);
  for (const [key, checkbox] of Object.entries(switches)) checkbox.checked = stored[key] !== false;
  render(stored['enabled'] !== false, response);
  document.body.dataset['ready'] = 'true';
}

void fetch('../stores.json')
  .then((response) => response.json() as Promise<StoreInfo[]>)
  .then((stores) => {
    storeList.textContent = stores.map(({ name }) => name).join(', ');
  });

void refresh();
setInterval(() => void refresh(), 1000);
chrome.storage.onChanged.addListener(() => void refresh());
