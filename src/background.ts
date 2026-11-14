import { isStatusMessage, isStatusRequest } from './types.ts';

const active = new Map<number, boolean>();

function show(tabId: number, isActive: boolean): void {
  active.set(tabId, isActive);
  const name = isActive ? 'on' : 'off';
  chrome.action.setIcon({ tabId, path: { 16: `icons/${name}-16.png`, 32: `icons/${name}-32.png` } }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse: (response: boolean) => void) => {
  if (isStatusMessage(message) && sender.tab?.id !== undefined) show(sender.tab.id, message.active);
  if (isStatusRequest(message)) sendResponse(active.get(message.tabId) ?? false);
});

const storePrefixes = (chrome.runtime.getManifest().content_scripts ?? []).flatMap((script) =>
  (script.matches ?? []).map((pattern) => pattern.slice(0, -1)),
);
const isStoreUrl = (url: string | undefined): boolean => storePrefixes.some((prefix) => url?.startsWith(prefix));

// A store tab keeps its state across loading events: the content script reports again on its own page loads.
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status === 'loading' && !isStoreUrl(tab.url)) show(tabId, false);
  if (change.status === 'complete' && active.get(tabId)) show(tabId, true);
});

chrome.tabs.onRemoved.addListener((tabId) => active.delete(tabId));
