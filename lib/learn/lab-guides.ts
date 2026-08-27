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
  "custom-headers": {
    steps: [
      "Validate → Send — assertions check the echo body.",
      "Response JSON → headers object lists X-Lab-Trace and X-Request-Source.",
      "Wire tab → confirm custom lines on Actually sent.",
      "Try adding X-Custom-Note: hello in the header textarea → Send again.",
    ],
    why: "Arbitrary request headers travel on the wire; servers and gateways may log, route, or reject them.",
    explain: [
      "Header names are case-insensitive; httpbin may normalize casing in JSON.",
      "Custom X-… headers are common for tracing (X-Request-Id), feature flags, and client metadata.",
      "Some proxies strip unknown headers; APIs document which custom headers they accept.",
    ],
    docs: [
      {
        label: "MDN: HTTP headers",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers",
        source: "MDN",
      },
    ],
  },
  "query-params": {
    steps: [
      "Send — Response args block should echo course, lesson, and debug.",
      "Open Params tab → toggle debug off → URL loses ?debug=true → Send → gone from args.",
      "Add sort=asc in Params → Send → new key appears in args.",
      "Encode — query string stays on the request line / :path pseudo-header.",
    ],
    why: "Query parameters encode filters and options in the URL without changing the path.",
    explain: [
      "?key=value pairs are separated by &; values should be percent-encoded when needed.",
      "GET requests often carry parameters in the query string; POST may use body instead.",
      "The Params tab edits the same URL the main editor shows — one source of truth.",
    ],
    docs: [
      {
        label: "MDN: URLSearchParams",
        url: "https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams",
        source: "MDN",
      },
    ],
  },
  "basic-auth": {
    steps: [
      "Send → expect 200 and authenticated: true (user learner).",
      "Auth tab → type Basic → username learner, password secret — headers update automatically.",
      "Remove Authorization → Send → 401 Unauthorized.",
      "Wrong password → Send → 401; Wire still shows Authorization on Actually sent.",
    ],
    why: "Basic sends credentials in one Authorization header (Base64, not encryption). Use HTTPS only.",
    explain: [
      "Format: Authorization: Basic base64(username:password).",
      "httpbin validates against the path /basic-auth/{user}/{pass}.",
      "Prefer OAuth2/Bearer or session cookies for production user login.",
    ],
    docs: [
      {
        label: "MDN: Authorization",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Authorization",
        source: "MDN",
      },
      {
        label: "RFC 7617 — Basic auth scheme",
        url: "https://www.rfc-editor.org/rfc/rfc7617",
        source: "RFC",
      },
    ],
  },
  "bearer-auth": {
    steps: [
      "Send → 200; body echoes your token.",
      "Auth tab → Bearer → paste a different token → Send → new value in response.",
      "Delete Authorization line → Send → 401.",
      "Next: **Lab: JWT Bearer** — same header shape, structured token + signature check.",
    ],
    why: "Bearer tokens (OAuth2, JWT, PAT) are the common API auth pattern after Basic.",
    explain: [
      "Format: Authorization: Bearer <token> — one secret string, no username.",
      "Opaque tokens (this httpbin lab) are validated server-side by lookup.",
      "JWTs are self-contained — see Lab: JWT Bearer for header.payload.signature.",
    ],
    docs: [
      {
        label: "MDN: Authorization",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Authorization",
        source: "MDN",
      },
      {
        label: "RFC 6750 — Bearer token",
        url: "https://www.rfc-editor.org/rfc/rfc6750",
        source: "RFC",
      },
    ],
  },
  "jwt-bearer": {
    steps: [
      "Send → 200; Response body lists decoded claims (sub: learner).",
      "Response tab → JWT Bearer teaching panel shows header / payload / signature colors.",
      "Change one character in the signature (last segment) → Send → 401 invalid_signature.",
      "Load Lab: JWT expired or JWT bad signature for the other failure modes.",
      "Remove Authorization → Send → 401 missing_bearer.",
    ],
    why: "JWT is still Authorization: Bearer on the wire — but the server parses, verifies, and checks exp.",
    explain: [
      "Segments: base64url(header).base64url(payload).base64url(HMAC-SHA256).",
      "This lab uses HS256 + a fixed teaching secret — production APIs often use RS256 + JWKS.",
      "exp (expiration) can fail auth even when the signature is valid.",
      "Malformed tokens (< 3 segments) → 400; bad signature or expired → 401.",
    ],
    docs: [
      {
        label: "RFC 7519 — JSON Web Token",
        url: "https://www.rfc-editor.org/rfc/rfc7519",
        source: "RFC",
      },
      {
        label: "RFC 7515 — JWS",
        url: "https://www.rfc-editor.org/rfc/rfc7515",
        source: "RFC",
      },
    ],
  },
  "jwt-expired": {
    steps: [
      "Send → 401 token_expired in JSON body.",
      "JWT panel → exp is in the past (2018) — signature was still verified first.",
      "Load Lab: JWT Bearer for a valid token → 200.",
    ],
    why: "Short-lived access tokens limit damage if leaked; clients refresh before exp.",
    explain: [
      "Order in this lab: parse → verify signature → then check exp.",
      "Clock skew: real servers may allow a small leeway (nbf / exp).",
    ],
  },
  "jwt-bad-signature": {
    steps: [
      "Send → 401 invalid_signature.",
      "Compare payload segment with Lab: JWT Bearer — payload unchanged, signature tampered.",
      "Edit payload (middle segment) without re-signing → same 401.",
    ],
    why: "The signature binds header + payload; any tampering must fail verification.",
  },
  "api-key-header": {
    steps: [
      "Send → /headers JSON includes X-Api-Key: lab-key-99.",
      "Auth tab → API key → header name X-API-Key, value lab-key-99 — same wire result.",
      "Switch API key to query param → URL gains ?X-API-Key=… (httpbin /get echoes args).",
    ],
    why: "API keys identify the caller; header vs query affects caching, logs, and referrer leakage.",
    explain: [
      "Header placement keeps keys out of browser history and server access-log query strings.",
      "Query keys are easy to try in a browser but may appear in Referer headers.",
    ],
    docs: [
      {
        label: "MDN: API keys (concept)",
        url: "https://developer.mozilla.org/en-US/docs/Glossary/API_key",
        source: "MDN",
      },
    ],
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
      "Send → expect 304 (Last-Modified equals If-Modified-Since on the teach lab).",
      "Change If-Modified-Since to an earlier date (e.g. Mon, 19 Oct 2015) → Send → 200, or load Lab: If-Modified-Since (200 stale).",
      "Do not use httpbin /cache for this lesson — it 304s whenever the header is present, even if Last-Modified is newer.",
    ],
    why: "Real servers compare dates: 304 only if the resource was not modified after If-Modified-Since.",
    explain: [
      "Last-Modified (response) ↔ If-Modified-Since (request).",
      "This app’s teach.local lab uses a fixed Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT.",
      "Last-Modified ≤ If-Modified-Since → 304. Last-Modified > If-Modified-Since → 200.",
      "httpbin /cache ignores the date and is misleading for learning.",
      "When both If-None-Match and If-Modified-Since are sent, If-None-Match usually wins.",
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
      {
        label: "RFC 9110 — If-Modified-Since",
        url: "https://www.rfc-editor.org/rfc/rfc9110#name-if-modified-since",
        source: "RFC",
      },
    ],
  },
  "conditional-ims-stale": {
    steps: [
      "Send → expect 200 (If-Modified-Since is before Last-Modified).",
      "Set If-Modified-Since to Wed, 21 Oct 2015 07:28:00 GMT → 304, or load the 304 IMS lab.",
    ],
    why: "Shows the opposite branch of the date comparison from the 304 lab.",
    explain: [
      "Client’s cached time is older than the resource → full 200 body + Last-Modified.",
      "Update your stored Last-Modified, then conditional GET again later.",
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
