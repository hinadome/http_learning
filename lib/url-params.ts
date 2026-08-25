export interface QueryParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

let paramId = 0;
export function newParamId(): string {
  return `p-${++paramId}`;
}

export function parseQueryParams(url: string): { base: string; params: QueryParam[] } {
  try {
    const u = new URL(url);
    const params: QueryParam[] = [];
    u.searchParams.forEach((value, key) => {
      params.push({ id: newParamId(), key, value, enabled: true });
    });
    u.search = "";
    return { base: u.href, params };
  } catch {
    return { base: url, params: [] };
  }
}

export function buildUrlWithParams(base: string, params: QueryParam[]): string {
  try {
    const u = new URL(base);
    u.search = "";
    for (const p of params) {
      if (!p.enabled || !p.key.trim()) continue;
      u.searchParams.append(p.key.trim(), p.value);
    }
    return u.href;
  } catch {
    return base;
  }
}
