export type UrlFilter = { pathPrefix: string; param: string; value: string };

export type ShadowRule = { card: string; host: string; marketplace: string };

export type Rule = {
  name: string;
  hosts: string[];
  urlFilter?: UrlFilter;
  card?: string;
  hide?: string;
  shadow?: ShadowRule;
};

export type CountRequest = { type: 'count' };

export type CountResponse = { store: string; hidden: number; total: number | null; filtered: boolean };

export function isCountRequest(message: unknown): message is CountRequest {
  return typeof message === 'object' && message !== null && 'type' in message && message.type === 'count';
}
