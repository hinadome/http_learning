# Changelog

All notable changes to **HTTP Learning Checker** are documented in this file.

Format inspired by [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

- (none)

---

## [0.1.1] — 2026-08-25

### Added

#### Duplicate header validation
- **Validate** warns when the same header name appears more than once (case-insensitive)
- Version-specific issue codes:
  - `duplicate_header_http1` — HTTP/1.x may send multiple lines; servers may combine or pick one
  - `duplicate_header_h2h3` — H2/H3 Send keeps the **last** value; message includes line numbers and winning value
- Validation panel **Duplicate headers detected** callout (yellow banner) with short explanation
- RFC/MDN doc links on duplicate-header issues ([RFC 9110 §5.3](https://www.rfc-editor.org/rfc/rfc9110#name-field-values), [RFC 9113 §8.3](https://www.rfc-editor.org/rfc/rfc9113#name-request-pseudo-header-field), MDN headers)
- Presets: **Lab: Duplicate Accept (1.1)**, **(H2)**, **(H3)**

#### Documentation
- README: **Duplicate headers (client vs server)** section (client vs server behavior, mental model)
- README: **Validation in this app** table including duplicate-header rules
- README: updated learning path, features, and labs list

### Changed
- `lib/validate/rules.ts` — duplicate detection after header line parsing
- `lib/learn/docs.ts` — `ISSUE_DOCS` entries for duplicate header codes
- `components/ValidationPanel.tsx` — duplicate-header summary callout

---

## [0.1.0] — 2026-08-25

Initial educational release: compose, validate, encode, and send HTTP/1.0–1.1 / 2 / 3 requests with learning-focused wire views and docs.

### Added

#### Core application
- Next.js (App Router) + TypeScript + React + Tailwind UI
- Line-by-line header editor, method/URL/version selectors, optional body
- Teaching proxy via Next.js API routes (`/api/validate`, `/api/encode`, `/api/send`, `/api/http3-support`)
- Lifecycle log, Wire/Binary tab, Response tab
- Presets/labs, glossary, RFC/MDN doc links, curl/fetch/raw export
- Request history in `localStorage` with **Clear history**
- SSRF defaults (private targets blocked), timeouts, response size cap
- README with architecture, URL usage, protocol notes, and project structure

#### HTTP/1.0 and HTTP/1.1
- Text wire encode (request line + headers + CRLF + body) with hex view
- Version validation (e.g. `Host` required on 1.1; chunked not valid on 1.0)
- Live send via Node `http` / `https`
- **Send anyway** + missing `Host`: Node `setHost: false` so Host is not auto-injected
- **Actually sent** panel: reconstructed wire text/hex, headers, equivalent curl

#### HTTP/2
- Live send via Node `http2` (HTTPS + ALPN `h2`)
- Educational HEADERS/DATA frames + HPACK field encoding
- Pseudo-headers (`:method`, `:scheme`, `:path`, `:authority`) from Method + URL
- Validation forbids connection-specific headers (`Connection`, `Transfer-Encoding`, …)
- Compare **1.1 vs 2** (text wire vs H2 frames)

#### HTTP/3
- Live send preferring **`@currentspace/http3`** (QUIC + TLS 1.3), with **`curl --http3`** fallback
- Alt-Svc probe (HTTPS HEAD) before/around send; surface Alt-Svc in lifecycle and **Actually sent**
- Educational HTTP/3 frames + QPACK-style field encoding
- Educational **QUIC / TLS 1.3 timeline** (UDP → handshake → SETTINGS → request stream)
- Richer **Actually sent** for H3: protocol, transport, Alt-Svc, stream id, pseudo-headers, QUIC notes, curl
- `/api/http3-support` reports `currentspace` and `curlHttp3` availability
- `serverExternalPackages: ["@currentspace/http3"]` for native/WASM runtime loading
- Labs: Cloudflare H3 targets, `:authority` from URL, Connection forbidden on H3
- Compare **1.1 vs 3** and **2 vs 3**; **HPACK vs QPACK** lesson panel

#### Teaching UX
- Expanded in-UI callout for HTTP/2 and HTTP/3: request line vs pseudo-headers, mapping from UI fields, forbidden headers, HPACK vs QPACK / QUIC notes, RFC/MDN links
- Consistent secondary button styling (Validate no longer looks permanently “focused”); Send remains primary
- Version docs panel keyed to selected HTTP version

### Implementation map

| Area | Location |
|------|----------|
| UI shell | `app/page.tsx`, `components/*` |
| Validate / encode / send APIs | `app/api/*/route.ts` |
| Parsing & safety | `lib/parse.ts`, `lib/safety.ts` |
| Validation rules | `lib/validate/rules.ts` |
| HTTP/1.x encode & send | `lib/encode/http1.ts`, `lib/clients/http1.ts` |
| HTTP/2 encode & send | `lib/encode/http2-frames.ts`, `lib/clients/http2.ts` |
| HTTP/3 encode & send | `lib/encode/http3-frames.ts`, `lib/clients/http3.ts`, `lib/clients/alt-svc.ts` |
| Actually sent reconstruction | `lib/clients/sent.ts` |
| QUIC timeline copy | `lib/learn/quic-timeline.ts` |
| Docs / presets / history | `lib/learn/*` |

### Dependencies (notable)
- `next`, `react`, `react-dom`
- `@currentspace/http3` — live HTTP/3 client
- Optional system dependency: `curl` built with HTTP3 (fallback only)
