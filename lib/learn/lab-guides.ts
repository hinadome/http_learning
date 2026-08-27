import type { DocRef } from "../types";

export interface LabGuide {
  steps: string[];
  why?: string;
  /** Extra teaching bullets under the preset explainer. */
  explain?: string[];
  docs?: DocRef[];
}

/** Guided “Try this” steps keyed by preset id. */
export const LAB_GUIDES: Record<string, LabGuide> = {
  "httpbin-get": {
    steps: [
      "Validate — should pass (Host present).",
      "Encode — inspect HTTP/1.1 text wire.",
      "Send — check Response status and Actually sent on Wire tab.",
    ],
    why: "Baseline happy-path request.",
  },
  "missing-host": {
    steps: [
      "Validate — expect Host required error on HTTP/1.1.",
      "Enable Send anyway → Send.",
      "Wire tab — confirm Host was omitted on Actually sent.",
    ],
    why: "HTTP/1.1 requires Host; many servers return 400 without it.",
  },
  "set-cookie-response": {
    steps: [
      "Keep Follow redirects off.",
      "Send → Response shows 302 + Set-Cookie; assertions should pass.",
      "Optional: enable Cookie jar + Follow redirects → Send → hop timeline shows Cookie on next hop.",
    ],
    why: "Set-Cookie is on the 302; enable Cookie jar to replay cookies after follow.",
  },
  "redirect-302": {
    steps: [
      "Send with Follow redirects off → see 302 + Location (assertion).",
      "Enable Follow redirects → Send → inspect redirect hop timeline.",
    ],
  },
  "range-206": {
    steps: [
      "Send → expect status 206 and Content-Range teaching.",
      "Compare without Range header (full 200) if curious.",
    ],
    why: "Range requests enable partial downloads and media seeking.",
  },
  "conditional-304": {
    steps: [
      "Send with If-None-Match → expect 304 (empty/short body).",
      "Remove If-None-Match → Send again → 200 + ETag.",
      "Read the Cache & validators panel (match vs mismatch).",
      "Then try Lab: If-Modified-Since (304) — the other validator.",
    ],
    why: "Conditional GET avoids re-downloading unchanged resources. This lab uses ETag / If-None-Match (preferred).",
    explain: [
      "If-None-Match lists ETags the client already has. Match → 304; mismatch → 200 + new body/ETag.",
      "Why not If-Modified-Since here? httpbin /etag only implements If-None-Match / If-Match — it ignores If-Modified-Since.",
      "If-Modified-Since pairs with Last-Modified (clock-based, weaker). Use Lab: If-Modified-Since (304) on /cache.",
      "When both validators are sent, servers usually prefer If-None-Match (RFC 9110).",
      "Prefer ETag over Last-Modified when both exist; weak ETags use W/\"…\".",
    ],
    docs: [
      {
        label: "MDN: If-None-Match",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-None-Match",
        source: "MDN",
      },
      {
        label: "MDN: If-Modified-Since",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-Modified-Since",
        source: "MDN",
      },
      {
        label: "MDN: ETag",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag",
        source: "MDN",
      },
    ],
  },
  "conditional-304-ims": {
    steps: [
      "Send with If-Modified-Since → expect 304 on httpbin /cache.",
      "Remove If-Modified-Since → Send → 200 + Last-Modified + ETag.",
      "Compare with Lab: Conditional GET (304) which uses If-None-Match on /etag.",
    ],
    why: "If-Modified-Since is the Last-Modified-based conditional GET; ETag / If-None-Match is usually stronger.",
    explain: [
      "Last-Modified (response) ↔ If-Modified-Since (request).",
      "httpbin /cache returns 304 if either If-Modified-Since or If-None-Match is present (simple demo — not full date comparison).",
      "Real servers compare the date: if the resource is not newer than your date → 304; else 200.",
      "If both If-None-Match and If-Modified-Since are sent, If-None-Match usually wins.",
    ],
    docs: [
      {
        label: "MDN: If-Modified-Since",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-Modified-Since",
        source: "MDN",
      },
      {
        label: "MDN: Last-Modified",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Last-Modified",
        source: "MDN",
      },
    ],
  },
  "cache-control": {
    steps: [
      "Send → inspect Cache-Control, Date, and any Age / Expires on Response.",
      "Read Precedence on this response — which signal wins (max-age vs Expires).",
      "Note: Age reduces remaining freshness (lifetime − Age); it is not a lifetime.",
      "Optional: Lab: Age / Expires precedence — all three headers at once.",
      "Then load Lab: Conditional GET (304) for If-None-Match revalidation.",
    ],
    why: "Freshness lifetime comes from Cache-Control / Expires; Age ages the copy; validators (ETag) recheck after stale or with no-cache.",
    explain: [
      "Precedence (high → low): no-store → no-cache → s-maxage (shared) → max-age → Expires (+ Date) → Age (adjusts remaining) → Last-Modified heuristic.",
      "max-age / s-maxage override Expires for lifetime (RFC 9111).",
      "Age: seconds already in a cache — remaining ≈ lifetime − Age.",
      "Expires: absolute clock time; use with Date. Prefer max-age in modern APIs.",
      "Date: origin generation time — anchor for Expires and Age interpretation.",
      "After freshness ends (or with no-cache): If-None-Match → 304 or 200.",
    ],
    docs: [
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
        label: "RFC 9111 — HTTP Caching",
        url: "https://www.rfc-editor.org/rfc/rfc9111",
        source: "RFC",
      },
    ],
  },
  "cache-precedence": {
    steps: [
      "Send — response echoes Cache-Control max-age=120, Expires, and Age=30.",
      "Open Cache & validators → Precedence: max-age should win over Expires.",
      "Check remaining hint ≈ 120 − 30 = 90s.",
      "Compare with Lab: Cache-Control (/cache/60) for a simpler max-age-only case.",
    ],
    why: "Seeing max-age, Expires, and Age together makes precedence concrete.",
    explain: [
      "max-age=120 wins lifetime; Expires is ignored for lifetime when max-age is present.",
      "Age=30 means ~90s of freshness left (120 − 30).",
      "Date (if present) anchors Expires; it does not override max-age.",
    ],
    docs: [
      {
        label: "RFC 9111 — Calculating Freshness Lifetime",
        url: "https://www.rfc-editor.org/rfc/rfc9111#name-calculating-freshness-lifet",
        source: "RFC",
      },
    ],
  },
  "hsts-header": {
    steps: [
      "Send → Strict-Transport-Security appears in response teaching.",
      "Note: browsers remember HSTS; this Node proxy does not.",
    ],
  },
  "cors-headers": {
    steps: [
      "Send → Access-Control-Allow-Origin on Response.",
      "Read CORS teaching panel — why browsers may still block XHR from a page.",
    ],
    why: "CORS is enforced by browsers, not by this teaching proxy.",
  },
  "websocket-echo": {
    steps: [
      "Protocol is WebSocket; URL is wss://…",
      "Set outbound message (e.g. Hello) → Send.",
      "Response body shows live frames (101 is a UI wrapper).",
    ],
  },
  "chunked-encoding": {
    steps: [
      "Encode (not required to Send) → Wire shows chunked framing.",
      "Note Transfer-Encoding: chunked in headers.",
    ],
    why: "Chunked is HTTP/1.1 body framing without Content-Length.",
  },
  "h2-trailers": {
    steps: ["Version HTTP/2 → Encode → look for trailing HEADERS frame."],
  },
  "h2-push": {
    steps: ["Version HTTP/2 → Encode → look for PUSH_PROMISE (educational)."],
  },
  "cl-te-smuggling": {
    steps: [
      "Encode only — do not Send to random targets.",
      "Inspect notes about Content-Length vs Transfer-Encoding.",
      "Read the linked RFC / MDN on request smuggling risks.",
    ],
    why: "Both CL and TE in one message is ambiguous and dangerous.",
    docs: [
      {
        label: "RFC 9112 — Message body",
        url: "https://www.rfc-editor.org/rfc/rfc9112#name-message-body",
        source: "RFC",
      },
      {
        label: "PortSwigger: HTTP request smuggling",
        url: "https://portswigger.net/web-security/request-smuggling",
        source: "Guide",
      },
    ],
  },
  "duplicate-accept-h2": {
    steps: [
      "Validate — duplicate header warning.",
      "Send → Wire / Actually sent keeps the last Accept value.",
    ],
  },
  "http2-get": {
    steps: [
      "Encode — pseudo-headers + HPACK.",
      "Send (https) — TLS/ALPN panel after connect.",
      "Open Multiplex simulator with packet loss.",
    ],
  },
  "http3-get": {
    steps: [
      "Encode — QPACK / QUIC timeline.",
      "Send if HTTP/3 transport available.",
      "Compare 2 vs 3 for HPACK vs QPACK.",
    ],
  },
};

export function getLabGuide(presetId: string | null | undefined): LabGuide | null {
  if (!presetId) return null;
  return LAB_GUIDES[presetId] ?? null;
}
