import type { CountRequest, CountResponse } from '../src/types.ts';

type StoreInfo = { name: string };

const query = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selector} missing`);
  return element;
};

const main = query<HTMLElement>('main');
const store = query<HTMLElement>('#store');
const count = query<HTMLOutputElement>('#count');
const countLabel = query<HTMLElement>('#count-label');
const stats = query<HTMLElement>('#stats');
const extra = query<HTMLElement>('#extra');
const unfilter = query<HTMLButtonElement>('#unfilter');
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

unfilter.addEventListener('click', () => {
  void chrome.storage.local.set({ useStoreFilters: false });
});

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
  if (!response) {
    main.dataset['state'] = 'unsupported';
    store.textContent = 'Not a supported store page';
    count.textContent = '–';
    countLabel.textContent = 'Open a store search page';
    stats.textContent = '';
    return;
  }
  const { hidden, total, filtered } = response;
  store.textContent = response.store;
  if (filtered) {
    main.dataset['state'] = 'filtered';
    count.textContent = 'Filtered';
    countLabel.textContent = 'by the store';
    stats.textContent = `Filtered by ${response.store}. The store hides marketplace listings before the page loads, so there is nothing to count. Turn off Use store filters to see counts.`;
    extra.hidden = hidden === 0;
    extra.textContent = `${hidden} more hidden by the extension`;
    return;
  }
  if (!enabled) {
    main.dataset['state'] = 'off';
    count.textContent = 'Off';
    countLabel.textContent = 'hiding is off';
    stats.textContent = total === null ? '' : `${total} listings on this page`;
    return;
  }
  main.dataset['state'] = 'on';
  count.textContent = String(hidden);
  countLabel.textContent = 'hidden on this page';
  stats.textContent = total
    ? `${hidden} of ${total} listings, ${Math.round((hidden / total) * 100)}%`
    : 'No listings found yet';
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
    storeList.replaceChildren(
      ...stores.map(({ name }) => Object.assign(document.createElement('li'), { textContent: name })),
    );
  });

void refresh();
setInterval(() => void refresh(), 1000);
chrome.storage.onChanged.addListener(() => void refresh());
