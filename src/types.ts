export type UrlFilter = { pathPrefix: string | string[]; param: string; value: string };

export type ShadowRule = { card: string; host: string; marketplace: string };

export type KeepRule = { badge: string; text: string };

export type Rule = {
  name: string;
  hosts: string[];
  urlFilter?: UrlFilter;
  card?: string;
  hide?: string;
  placeholder?: string;
  shadow?: ShadowRule;
  keep?: KeepRule;
  note?: string;
};

export type CountRequest = { type: 'count' };

export type CountResponse = { store: string; hidden: number; total: number | null; filtered: boolean; filterable: boolean; note: string | null };

export type StatusMessage = { type: 'status'; active: boolean };

export type StatusRequest = { type: 'getStatus'; tabId: number };

const hasType = (message: unknown, type: string): boolean =>
  typeof message === 'object' && message !== null && 'type' in message && message.type === type;

export const isCountRequest = (message: unknown): message is CountRequest => hasType(message, 'count');

export const isStatusMessage = (message: unknown): message is StatusMessage => hasType(message, 'status');

export const isStatusRequest = (message: unknown): message is StatusRequest => hasType(message, 'getStatus');
