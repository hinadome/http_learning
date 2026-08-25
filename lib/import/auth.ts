export type AuthType = "none" | "basic" | "bearer" | "api-key";

export interface AuthState {
  type: AuthType;
  username: string;
  password: string;
  bearerToken: string;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyIn: "header" | "query";
}

export const EMPTY_AUTH: AuthState = {
  type: "none",
  username: "",
  password: "",
  bearerToken: "",
  apiKeyName: "X-API-Key",
  apiKeyValue: "",
  apiKeyIn: "header",
};

export function parseAuthFromHeaders(headerText: string): AuthState {
  const lines = headerText.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^authorization\s*:\s*(.+)$/i);
    if (!m) continue;
    const val = m[1].trim();
    if (/^basic\s+/i.test(val)) {
      try {
        const decoded = Buffer.from(val.replace(/^basic\s+/i, ""), "base64").toString(
          "utf8"
        );
        const colon = decoded.indexOf(":");
        return {
          ...EMPTY_AUTH,
          type: "basic",
          username: colon >= 0 ? decoded.slice(0, colon) : decoded,
          password: colon >= 0 ? decoded.slice(colon + 1) : "",
        };
      } catch {
        return { ...EMPTY_AUTH, type: "basic" };
      }
    }
    if (/^bearer\s+/i.test(val)) {
      return {
        ...EMPTY_AUTH,
        type: "bearer",
        bearerToken: val.replace(/^bearer\s+/i, ""),
      };
    }
  }
  for (const line of lines) {
    const m = line.match(/^([^:\s]+)\s*:\s*(.+)$/);
    if (!m) continue;
    const name = m[1];
    if (/api.?key|x-api-key/i.test(name)) {
      return {
        ...EMPTY_AUTH,
        type: "api-key",
        apiKeyName: name,
        apiKeyValue: m[2].trim(),
        apiKeyIn: "header",
      };
    }
  }
  return { ...EMPTY_AUTH };
}

export function applyAuthToHeaders(
  headerText: string,
  auth: AuthState
): string {
  const lines = headerText
    .split(/\r?\n/)
    .filter((l) => {
      const lower = l.toLowerCase();
      if (lower.startsWith("authorization:")) return false;
      if (auth.type === "api-key" && auth.apiKeyIn === "header") {
        const name = auth.apiKeyName.toLowerCase();
        if (lower.startsWith(`${name}:`)) return false;
      }
      return l.trim().length > 0;
    });

  if (auth.type === "basic" && (auth.username || auth.password)) {
    const encoded = Buffer.from(`${auth.username}:${auth.password}`, "utf8").toString(
      "base64"
    );
    lines.push(`Authorization: Basic ${encoded}`);
  } else if (auth.type === "bearer" && auth.bearerToken) {
    lines.push(`Authorization: Bearer ${auth.bearerToken}`);
  } else if (auth.type === "api-key" && auth.apiKeyValue && auth.apiKeyIn === "header") {
    lines.push(`${auth.apiKeyName}: ${auth.apiKeyValue}`);
  }

  return lines.join("\n");
}

export function applyApiKeyToUrl(url: string, auth: AuthState): string {
  if (auth.type !== "api-key" || auth.apiKeyIn !== "query" || !auth.apiKeyValue) {
    return url;
  }
  try {
    const u = new URL(url);
    if (auth.apiKeyName.trim()) {
      u.searchParams.set(auth.apiKeyName.trim(), auth.apiKeyValue);
    }
    return u.href;
  } catch {
    return url;
  }
}

export function stripApiKeyFromUrl(url: string, auth: AuthState): string {
  if (auth.type !== "api-key" || auth.apiKeyIn !== "query" || !auth.apiKeyName.trim()) {
    return url;
  }
  try {
    const u = new URL(url);
    u.searchParams.delete(auth.apiKeyName.trim());
    const s = u.searchParams.toString();
    u.search = s ? `?${s}` : "";
    return u.href;
  } catch {
    return url;
  }
}
