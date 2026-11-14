export type UrlFilter = { pathPrefix: string; param: string; value: string };

export type ShadowRule = { card: string; host: string; marketplace: string };

export type Rule = {
  hosts: string[];
  urlFilter?: UrlFilter;
  hide?: string;
  shadow?: ShadowRule;
};
