const checkbox = document.querySelector<HTMLInputElement>('#use-store-filters');
if (!checkbox) throw new Error('#use-store-filters missing');

void chrome.storage.local.get('useStoreFilters').then((stored) => {
  checkbox.checked = stored['useStoreFilters'] !== false;
});
checkbox.addEventListener('change', () => {
  void chrome.storage.local.set({ useStoreFilters: checkbox.checked });
});
