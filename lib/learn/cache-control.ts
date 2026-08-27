import type { DocRef } from "../types";

export interface DirectiveExplain {
  name: string;
  value?: string;
  summary: string;
}

export interface FreshnessSignal {
  id: string;
  rank: number;
  header: string;
  value: string;
  role: string;
  wins: boolean;
  note: string;
}

const DIRECTIVE_HELP: Record<string, string> = {
  "max-age":
    "Fresh for this many seconds from when the response was generated (then subtract Age). After that, revalidate or refetch.",
  "s-maxage":
    "Like max-age but for shared caches (CDN/proxy) only; overrides max-age for them.",
  "no-cache":
    "May store the response, but must revalidate with the origin before reuse (often with ETag / Last-Modified). Not the same as no-store.",
  "no-store":
    "Do not store the response in any cache (browser or shared). Strongest “don’t remember this”.",
  "private":
    "Browser (private) caches may store it; shared caches (CDN) must not.",
  public:
    "May be stored by shared caches even if normally private (e.g. with Authorization).",
  "must-revalidate":
    "Once stale, must revalidate with the origin before serving — no serving stale.",
  "proxy-revalidate":
    "Like must-revalidate but only for shared caches.",
  immutable:
    "While fresh, the representation will not change — skip revalidation (common for fingerprinted assets).",
  "no-transform":
    "Intermediaries must not rewrite the body (e.g. image recompression).",
  "only-if-cached":
    "Request directive: only return a cached response; otherwise 504.",
  "max-stale":
    "Request directive: client accepts a stale response up to N seconds past freshness.",
  "min-fresh":
    "Request directive: response must still be fresh for at least N more seconds.",
  "stale-while-revalidate":
    "May serve stale while revalidating in the background for this many seconds.",
  "stale-if-error":
    "May serve stale if the origin errors, for this many seconds.",
};

/** Split a Cache-Control header into explained directives. */
export function explainCacheControl(headerValue: string): DirectiveExplain[] {
  const parts = headerValue.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.map((part) => {
    const eq = part.indexOf("=");
    const name = (eq >= 0 ? part.slice(0, eq) : part).trim().toLowerCase();
    const value = eq >= 0 ? part.slice(eq + 1).trim() : undefined;
    const help = DIRECTIVE_HELP[name];
    return {
      name,
      value,
      summary:
        help ??
        "See MDN Cache-Control — uncommon or extension directive.",
    };
  });
}

function ccHas(cc: string | undefined, name: string): boolean {
  if (!cc) return false;
  return cc
    .split(",")
    .some((p) => p.trim().toLowerCase().startsWith(name.toLowerCase()));
}

function ccValue(cc: string | undefined, name: string): string | undefined {
  if (!cc) return undefined;
  for (const part of cc.split(",")) {
    const p = part.trim();
    const eq = p.indexOf("=");
    const n = (eq >= 0 ? p.slice(0, eq) : p).trim().toLowerCase();
    if (n === name.toLowerCase()) {
      return eq >= 0 ? p.slice(eq + 1).trim() : "";
    }
  }
  return undefined;
}

/**
 * Rank freshness signals present on this response (RFC 9111 teaching sketch).
 * Lower rank = higher precedence for deciding freshness lifetime.
 */
export function analyzeFreshnessPrecedence(opts: {
  cacheControl?: string;
  expires?: string;
  date?: string;
  age?: string;
  lastModified?: string;
  /** When true, apply s-maxage preference (shared/CDN cache). Default true for teaching both. */
  sharedCache?: boolean;
}): {
  signals: FreshnessSignal[];
  summary: string;
  remainingHint?: string;
} {
  const {
    cacheControl,
    expires,
    date,
    age,
    lastModified,
    sharedCache = true,
  } = opts;
  const signals: FreshnessSignal[] = [];

  if (ccHas(cacheControl, "no-store")) {
    signals.push({
      id: "no-store",
      rank: 0,
      header: "Cache-Control",
      value: "no-store",
      role: "Storage ban",
      wins: true,
      note: "Do not store — freshness lifetime is irrelevant; caches must not keep this response.",
    });
  }

  if (ccHas(cacheControl, "no-cache")) {
    signals.push({
      id: "no-cache",
      rank: 1,
      header: "Cache-Control",
      value: "no-cache",
      role: "Force revalidate",
      wins: !ccHas(cacheControl, "no-store"),
      note: "May store, but must revalidate with the origin before every reuse (usually via ETag).",
    });
  }

  const sMax = ccValue(cacheControl, "s-maxage");
  const maxAge = ccValue(cacheControl, "max-age");

  if (sMax != null && sMax !== "") {
    signals.push({
      id: "s-maxage",
      rank: 2,
      header: "Cache-Control",
      value: `s-maxage=${sMax}`,
      role: "Freshness (shared caches)",
      wins:
        sharedCache &&
        !ccHas(cacheControl, "no-store") &&
        !ccHas(cacheControl, "no-cache"),
      note: `Shared caches use ${sMax}s as freshness lifetime; overrides max-age for CDNs/proxies. Private browsers ignore s-maxage.`,
    });
  }

  if (maxAge != null && maxAge !== "") {
    const sMaxWins =
      sharedCache &&
      sMax != null &&
      sMax !== "" &&
      !ccHas(cacheControl, "no-store");
    signals.push({
      id: "max-age",
      rank: 3,
      header: "Cache-Control",
      value: `max-age=${maxAge}`,
      role: "Freshness (all caches)",
      wins:
        !ccHas(cacheControl, "no-store") &&
        !ccHas(cacheControl, "no-cache") &&
        !sMaxWins,
      note: sMaxWins
        ? `Present, but shared caches prefer s-maxage=${sMax}. Browsers still use max-age=${maxAge}.`
        : `Freshness lifetime = ${maxAge}s from when the response was generated (see Age). Overrides Expires when both exist.`,
    });
  }

  if (expires) {
    const ccLifetime =
      (sharedCache && sMax != null && sMax !== "") ||
      (maxAge != null && maxAge !== "");
    signals.push({
      id: "expires",
      rank: 4,
      header: "Expires",
      value: expires,
      role: "Absolute expiry (legacy)",
      wins:
        !ccHas(cacheControl, "no-store") &&
        !ccHas(cacheControl, "no-cache") &&
        !ccLifetime,
      note: ccLifetime
        ? "Ignored for freshness lifetime when Cache-Control max-age / s-maxage is present (RFC 9111)."
        : "Fresh until this clock time. Compare with Date (or local clock). Prefer Cache-Control max-age in modern APIs.",
    });
  }

  if (date) {
    signals.push({
      id: "date",
      rank: 5,
      header: "Date",
      value: date,
      role: "Origin clock anchor",
      wins: false,
      note: "When the origin generated the message. Used with Expires (Expires − Date) and to interpret Age.",
    });
  }

  if (age) {
    const lifetime =
      (sharedCache && sMax != null && sMax !== "" ? sMax : undefined) ??
      maxAge;
    let remaining: string | undefined;
    if (lifetime != null && lifetime !== "") {
      const left = parseInt(lifetime, 10) - parseInt(age, 10);
      if (Number.isFinite(left)) {
        remaining =
          left > 0
            ? `≈ ${left}s of freshness left (${lifetime} − Age ${age})`
            : `Stale by ≈ ${Math.abs(left)}s (Age ${age} ≥ lifetime ${lifetime})`;
      }
    }
    signals.push({
      id: "age",
      rank: 6,
      header: "Age",
      value: `${age}s`,
      role: "Current age in cache",
      wins: false,
      note: remaining
        ? `Seconds since the origin generated (or revalidated) this response. ${remaining}.`
        : "Seconds this response has already aged in a cache. Subtract from freshness lifetime: remaining ≈ lifetime − Age.",
    });
  }

  if (lastModified && !maxAge && !sMax && !expires) {
    signals.push({
      id: "heuristic",
      rank: 7,
      header: "Last-Modified",
      value: lastModified,
      role: "Heuristic freshness",
      wins: !ccHas(cacheControl, "no-store") && !ccHas(cacheControl, "no-cache"),
      note: "No explicit lifetime — caches may use a heuristic (often a fraction of time since Last-Modified). Prefer sending max-age or Expires.",
    });
  }

  signals.sort((a, b) => a.rank - b.rank);
  const winner = signals.find((s) => s.wins);

  let summary =
    "No explicit freshness lifetime on this response — caches may use heuristics or treat as immediately stale.";
  if (winner?.id === "no-store") {
    summary = "no-store wins: do not cache this response at all.";
  } else if (winner?.id === "no-cache") {
    summary =
      "no-cache wins for reuse policy: may store, but revalidate before every use.";
  } else if (winner?.id === "s-maxage") {
    summary = `Shared-cache freshness from s-maxage (overrides max-age for CDNs). ${age ? "Apply Age against that lifetime." : ""}`;
  } else if (winner?.id === "max-age") {
    summary = `Freshness lifetime from max-age. ${age ? "Remaining ≈ max-age − Age." : "Age (if a cache adds it later) reduces remaining freshness."}`;
  } else if (winner?.id === "expires") {
    summary =
      "Freshness from Expires (minus Date). Add Cache-Control max-age for clearer modern behavior.";
  } else if (winner?.id === "heuristic") {
    summary =
      "Heuristic freshness from Last-Modified only — unpredictable; send Cache-Control.";
  }

  const ageNum = age != null ? parseInt(age, 10) : NaN;
  const lifeNum = parseInt(
    (sharedCache && sMax != null && sMax !== "" ? sMax : maxAge) ?? "",
    10
  );
  let remainingHint: string | undefined;
  if (Number.isFinite(ageNum) && Number.isFinite(lifeNum)) {
    const left = lifeNum - ageNum;
    remainingHint =
      left > 0
        ? `Estimated fresh for ~${left}s more`
        : `Estimated stale (~${Math.abs(left)}s past lifetime)`;
  }

  return { signals, summary, remainingHint };
}

export const FRESHNESS_PRECEDENCE_STEPS: Array<{
  title: string;
  detail: string;
}> = [
  {
    title: "1. no-store",
    detail: "Do not store — stop. No freshness calculation.",
  },
  {
    title: "2. no-cache",
    detail:
      "May store, but must revalidate before reuse (validators matter more than Age).",
  },
  {
    title: "3. s-maxage (shared caches)",
    detail: "CDN/proxy freshness lifetime; overrides max-age for shared caches only.",
  },
  {
    title: "4. max-age",
    detail:
      "Freshness lifetime in seconds for browsers (and shared caches if no s-maxage). Overrides Expires.",
  },
  {
    title: "5. Expires (+ Date)",
    detail:
      "Absolute expiry time. Lifetime ≈ Expires − Date. Used only when no max-age/s-maxage.",
  },
  {
    title: "6. Age",
    detail:
      "Not a lifetime itself — how old the stored response already is. remaining ≈ lifetime − Age.",
  },
  {
    title: "7. Heuristic (Last-Modified)",
    detail:
      "If nothing else, caches may guess freshness from Last-Modified. Prefer explicit Cache-Control.",
  },
];

export const VALIDATOR_PRECEDENCE_STEPS: Array<{
  title: string;
  detail: string;
}> = [
  {
    title: "If-None-Match (ETag)",
    detail:
      "Preferred when both validators are sent. Match → 304; any mismatch → usually full 200.",
  },
  {
    title: "If-Modified-Since (Last-Modified)",
    detail:
      "Used when no If-None-Match, or as a fallback. Weaker clock-based check.",
  },
];

export function explainEtag(etag: string): string {
  const weak = etag.trim().startsWith("W/");
  return weak
    ? `Weak ETag (${etag}) — semantic equivalence; may match even if bytes differ slightly.`
    : `Strong ETag (${etag}) — byte-for-byte identity of the representation.`;
}

export function explainAge(age: string): string {
  return (
    `Age: ${age} — seconds this response has already spent in a cache (or since generation). ` +
    "Caches add/update Age on the way to you. It does not set lifetime; it reduces remaining freshness: remaining ≈ lifetime − Age."
  );
}

export function explainExpires(expires: string, date?: string): string {
  if (date) {
    return (
      `Expires: ${expires} with Date: ${date}. Absolute expiry — fresh until Expires if no max-age/s-maxage. ` +
      "If Expires ≤ Date, the response is already stale."
    );
  }
  return (
    `Expires: ${expires} — absolute HTTP-date when the response becomes stale. ` +
    "Compare with Date (or the cache’s clock). Ignored for lifetime when Cache-Control max-age or s-maxage is present."
  );
}

export function explainConditionalOutcome(opts: {
  status: number;
  requestIfNoneMatch?: string;
  requestIfModifiedSince?: string;
  responseEtag?: string;
  responseLastModified?: string;
}): { title: string; detail: string } {
  const {
    status,
    requestIfNoneMatch,
    requestIfModifiedSince,
    responseEtag,
    responseLastModified,
  } = opts;

  if (status === 304) {
    const how = requestIfNoneMatch
      ? `If-None-Match matched${requestIfModifiedSince ? " (If-Modified-Since was also sent; ETag check usually wins)" : ""}.`
      : requestIfModifiedSince
        ? "If-Modified-Since indicated the copy is still current (or the demo endpoint treated the header as conditional)."
        : "A validator matched.";
    return {
      title: "304 Not Modified",
      detail: `${how} Caches keep the stored body; the network response usually has no body — only updated headers (often new Age / Cache-Control).`,
    };
  }

  if (requestIfNoneMatch && status === 200) {
    return {
      title: "200 — If-None-Match did not match (or was ignored)",
      detail: `Client sent If-None-Match: ${requestIfNoneMatch}. Server returned a full body${
        responseEtag ? ` with ETag ${responseEtag}` : ""
      }. Store the new representation and use that ETag next time.`,
    };
  }

  if (requestIfModifiedSince && status === 200) {
    return {
      title: "200 — resource newer than If-Modified-Since (or header ignored)",
      detail: `Client sent If-Modified-Since: ${requestIfModifiedSince}. Full body returned${
        responseLastModified
          ? `; Last-Modified is now ${responseLastModified}`
          : ""
      }.`,
    };
  }

  if (responseEtag && status === 200) {
    return {
      title: "Store validators for next conditional GET",
      detail: `Save ETag ${responseEtag}${
        responseLastModified ? ` and Last-Modified ${responseLastModified}` : ""
      }. Next time send If-None-Match (preferred) and/or If-Modified-Since. Unchanged → 304; changed → 200.`,
    };
  }

  if (responseLastModified && status === 200) {
    return {
      title: "Store Last-Modified for If-Modified-Since",
      detail: `Save Last-Modified: ${responseLastModified} and send If-Modified-Since on later GETs. Prefer adding an ETag when the server provides one.`,
    };
  }

  return {
    title: "Conditional requests",
    detail:
      "Pair response ETag / Last-Modified with request If-None-Match / If-Modified-Since. If-None-Match is preferred when both are available.",
  };
}

export const CACHE_LAB_DOCS: DocRef[] = [
  {
    label: "MDN: Cache-Control",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control",
    source: "MDN",
  },
  {
    label: "MDN: Age",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Age",
    source: "MDN",
  },
  {
    label: "MDN: Expires",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Expires",
    source: "MDN",
  },
  {
    label: "MDN: ETag",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag",
    source: "MDN",
  },
  {
    label: "MDN: If-None-Match",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-None-Match",
    source: "MDN",
  },
  {
    label: "RFC 9111 — HTTP Caching",
    url: "https://www.rfc-editor.org/rfc/rfc9111",
    source: "RFC",
  },
];
