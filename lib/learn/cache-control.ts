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

/** Common teaching example: ~10% of (Date − Last-Modified), floored to seconds. */
export function heuristicLifetimeSeconds(
  date?: string,
  lastModified?: string
): number | null {
  if (!date || !lastModified) return null;
  const d = Date.parse(date);
  const lm = Date.parse(lastModified);
  if (!Number.isFinite(d) || !Number.isFinite(lm) || d <= lm) return null;
  return Math.max(0, Math.floor(((d - lm) / 1000) * 0.1));
}

export type CacheRole = "browser" | "shared";

export type CacheDecisionOutcome =
  | "no-store"
  | "private-skip-shared"
  | "revalidate"
  | "serve-fresh"
  | "revalidate-stale"
  | "unknown";

export interface CacheDecisionStep {
  id: string;
  title: string;
  detail: string;
  active: boolean;
}

export interface CacheDecisionAnalysis {
  role: CacheRole;
  outcome: CacheDecisionOutcome;
  outcomeLabel: string;
  steps: CacheDecisionStep[];
  freshnessLifetimeSec: number | null;
  ageSec: number | null;
  remainingSec: number | null;
  ageSimpleNote: string;
  ageRfcNote: string;
  disclaimer: string;
}

/**
 * Teaching sketch of storage → freshness → age → serve/revalidate.
 * Does not implement a real cache — analyzes headers only.
 */
export function analyzeCacheDecision(opts: {
  cacheControl?: string;
  expires?: string;
  date?: string;
  age?: string;
  lastModified?: string;
  role: CacheRole;
}): CacheDecisionAnalysis {
  const sharedCache = opts.role === "shared";
  const { cacheControl, expires, date, age, lastModified } = opts;
  const noStore = ccHas(cacheControl, "no-store");
  const isPrivate = ccHas(cacheControl, "private");
  const noCache = ccHas(cacheControl, "no-cache");
  const sMax = ccValue(cacheControl, "s-maxage");
  const maxAge = ccValue(cacheControl, "max-age");

  let freshnessLifetimeSec: number | null = null;
  let lifetimeSource = "none";

  if (sharedCache && sMax != null && sMax !== "") {
    const n = parseInt(sMax, 10);
    if (Number.isFinite(n)) {
      freshnessLifetimeSec = n;
      lifetimeSource = "s-maxage";
    }
  } else if (maxAge != null && maxAge !== "") {
    const n = parseInt(maxAge, 10);
    if (Number.isFinite(n)) {
      freshnessLifetimeSec = n;
      lifetimeSource = "max-age";
    }
  } else if (expires && date) {
    const e = Date.parse(expires);
    const d = Date.parse(date);
    if (Number.isFinite(e) && Number.isFinite(d)) {
      freshnessLifetimeSec = Math.max(0, Math.floor((e - d) / 1000));
      lifetimeSource = "Expires − Date";
    }
  } else if (expires) {
    lifetimeSource = "Expires (needs Date for Δ)";
  } else {
    const h = heuristicLifetimeSeconds(date, lastModified);
    if (h != null) {
      freshnessLifetimeSec = h;
      lifetimeSource = "~10% × (Date − Last-Modified) example";
    }
  }

  const ageSec =
    age != null && age !== "" && Number.isFinite(parseInt(age, 10))
      ? parseInt(age, 10)
      : null;

  let remainingSec: number | null = null;
  if (freshnessLifetimeSec != null && ageSec != null) {
    remainingSec = freshnessLifetimeSec - ageSec;
  } else if (freshnessLifetimeSec != null && ageSec == null) {
    remainingSec = freshnessLifetimeSec;
  }

  const blockedPrivateShared = sharedCache && isPrivate && !noStore;

  let outcome: CacheDecisionOutcome = "unknown";
  let outcomeLabel =
    "Not enough signals to decide — treat as immediately stale or use validators.";

  if (noStore) {
    outcome = "no-store";
    outcomeLabel = "Do not use cache — fetch a fresh copy from the origin.";
  } else if (blockedPrivateShared) {
    outcome = "private-skip-shared";
    outcomeLabel =
      "Shared cache must not store/use this response (private to the browser).";
  } else if (noCache) {
    outcome = "revalidate";
    outcomeLabel =
      "May have a stored copy, but must revalidate before reuse (even if still within max-age).";
  } else if (remainingSec != null && remainingSec > 0) {
    outcome = "serve-fresh";
    outcomeLabel = `Fresh (~${remainingSec}s left) — a cache may serve without contacting the origin.`;
  } else if (remainingSec != null && remainingSec <= 0) {
    outcome = "revalidate-stale";
    outcomeLabel =
      "Stale — revalidate with If-None-Match (ETag) and/or If-Modified-Since before serving.";
  } else if (freshnessLifetimeSec == null && (lastModified || age)) {
    outcome = "revalidate-stale";
    outcomeLabel =
      "No clear freshness lifetime — revalidate or treat as stale; prefer explicit max-age.";
  }

  const steps: CacheDecisionStep[] = [
    {
      id: "storage-no-store",
      title: "1. Storage — no-store?",
      detail: noStore
        ? "Yes → do not store or reuse; go to origin."
        : "No no-store on this response.",
      active: noStore,
    },
    {
      id: "storage-private",
      title: "2. Storage — private on shared cache?",
      detail: blockedPrivateShared
        ? "Yes → CDN/proxy must skip this entry (browser may still cache)."
        : sharedCache
          ? isPrivate
            ? "private is set but already blocked by no-store."
            : "Not private (or viewing as browser) — shared cache may store if otherwise allowed."
          : "Viewing as browser — private does not block browser storage.",
      active: blockedPrivateShared,
    },
    {
      id: "freshness",
      title: "3. Freshness lifetime (T_fresh)",
      detail:
        freshnessLifetimeSec != null
          ? `T_fresh ≈ ${freshnessLifetimeSec}s from ${lifetimeSource}.`
          : `No numeric lifetime yet (${lifetimeSource}).`,
      active:
        !noStore &&
        !blockedPrivateShared &&
        freshnessLifetimeSec != null,
    },
    {
      id: "age",
      title: "4. Current age",
      detail:
        ageSec != null
          ? `Age header = ${ageSec}s → remaining ≈ T_fresh − Age${
              remainingSec != null ? ` = ${remainingSec}s` : ""
            }.`
          : "No Age header — teaching sketch treats remaining ≈ full T_fresh (real caches also add resident time).",
      active: !noStore && !blockedPrivateShared && ageSec != null,
    },
    {
      id: "reuse",
      title: "5. Serve vs revalidate",
      detail: outcomeLabel,
      active: !noStore && !blockedPrivateShared,
    },
  ];

  const ageSimpleNote =
    ageSec != null && freshnessLifetimeSec != null
      ? `This app’s sketch: remaining ≈ ${freshnessLifetimeSec} − ${ageSec} = ${
          remainingSec ?? "?"
        }s (uses Age header only).`
      : ageSec != null
        ? `Age: ${ageSec}s on this response. Pair with max-age / s-maxage to estimate remaining freshness.`
        : "No Age header on this response. When a cache stores the response, it will add/update Age later.";

  const ageRfcNote =
    "RFC 9111 sketch: current_age ≈ max(apparent_age, Age_header) + response_delay + resident_time, " +
    "where apparent_age ≈ max(0, response_time − Date). This teaching proxy only sees one snapshot, so it uses Age (or 0) for the simple remaining estimate.";

  return {
    role: opts.role,
    outcome,
    outcomeLabel,
    steps,
    freshnessLifetimeSec,
    ageSec,
    remainingSec,
    ageSimpleNote,
    ageRfcNote,
    disclaimer:
      "Teaching sketch only — this app does not store responses or serve from a local cache. Decisions are inferred from headers on this Send.",
  };
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

  if (ccHas(cacheControl, "private") && sharedCache) {
    signals.push({
      id: "private",
      rank: 0.5,
      header: "Cache-Control",
      value: "private",
      role: "Shared-cache storage ban",
      wins: !ccHas(cacheControl, "no-store"),
      note: "Shared caches (CDN/proxy) must not store this response — private to the browser. Freshness lifetime still matters for browser caches.",
    });
  }

  if (ccHas(cacheControl, "no-cache")) {
    signals.push({
      id: "no-cache",
      rank: 1,
      header: "Cache-Control",
      value: "no-cache",
      role: "Force revalidate",
      wins:
        !ccHas(cacheControl, "no-store") &&
        !(sharedCache && ccHas(cacheControl, "private")),
      note: "May store, but must revalidate with the origin before every reuse — even if still within max-age (usually via ETag).",
    });
  }

  const sMax = ccValue(cacheControl, "s-maxage");
  const maxAge = ccValue(cacheControl, "max-age");

  const blockedSharedPrivate =
    sharedCache && ccHas(cacheControl, "private");
  const storageBanned =
    ccHas(cacheControl, "no-store") || blockedSharedPrivate;

  if (sMax != null && sMax !== "") {
    signals.push({
      id: "s-maxage",
      rank: 2,
      header: "Cache-Control",
      value: `s-maxage=${sMax}`,
      role: "Freshness (shared caches)",
      wins:
        sharedCache &&
        !storageBanned &&
        !ccHas(cacheControl, "no-cache"),
      note: `Shared caches use ${sMax}s as freshness lifetime; overrides max-age for CDNs/proxies. Private browsers ignore s-maxage.`,
    });
  }

  if (maxAge != null && maxAge !== "") {
    const sMaxWins =
      sharedCache &&
      sMax != null &&
      sMax !== "" &&
      !storageBanned;
    signals.push({
      id: "max-age",
      rank: 3,
      header: "Cache-Control",
      value: `max-age=${maxAge}`,
      role: "Freshness (all caches)",
      wins:
        !storageBanned &&
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
        !storageBanned &&
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
    const heuristicSecs = heuristicLifetimeSeconds(date, lastModified);
    signals.push({
      id: "heuristic",
      rank: 7,
      header: "Last-Modified",
      value: lastModified,
      role: "Heuristic freshness",
      wins: !storageBanned && !ccHas(cacheControl, "no-cache"),
      note: heuristicSecs != null
        ? `No explicit lifetime — example heuristic ≈ 10% of (Date − Last-Modified) ≈ ${heuristicSecs}s. Prefer sending max-age or Expires.`
        : "No explicit lifetime — caches may use a heuristic (often ~10% of time since Last-Modified). Prefer sending max-age or Expires.",
    });
  }

  signals.sort((a, b) => a.rank - b.rank);
  const winner = signals.find((s) => s.wins);

  let summary =
    "No explicit freshness lifetime on this response — caches may use heuristics or treat as immediately stale.";
  if (winner?.id === "no-store") {
    summary = "no-store wins: do not cache this response at all.";
  } else if (winner?.id === "private") {
    summary =
      "private + shared cache: CDN/proxy must not store this response (browser caches may still apply max-age).";
  } else if (winner?.id === "no-cache") {
    summary =
      "no-cache wins for reuse policy: may store, but revalidate before every use — even within max-age.";
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
    title: "2. private (shared caches)",
    detail:
      "CDN/proxy must not store private responses; browser caches may still use max-age.",
  },
  {
    title: "3. no-cache",
    detail:
      "May store, but must revalidate before reuse — even within max-age (validators matter).",
  },
  {
    title: "4. s-maxage (shared caches)",
    detail: "CDN/proxy freshness lifetime; overrides max-age for shared caches only.",
  },
  {
    title: "5. max-age",
    detail:
      "Freshness lifetime in seconds for browsers (and shared caches if no s-maxage). Overrides Expires.",
  },
  {
    title: "6. Expires (+ Date)",
    detail:
      "Absolute expiry time. Lifetime ≈ Expires − Date. Used only when no max-age/s-maxage.",
  },
  {
    title: "7. Age",
    detail:
      "Not a lifetime itself — how old the stored response already is. remaining ≈ lifetime − Age (simplified).",
  },
  {
    title: "8. Heuristic (Last-Modified)",
    detail:
      "If nothing else, caches may guess (~10% of Date − Last-Modified is a common example). Prefer explicit Cache-Control.",
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
