# Changelog

All notable changes to **HTTP Learning Checker** are documented in this file.

Format inspired by [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

- (none)

---

## [0.4.0] — 2026-08-25

### Added

#### Phase 4 — Deeper protocol labs
- **Dark mode** — theme toggle + `prefers-color-scheme` + localStorage (no hydration flash)
- **Multiplex load simulator** — animated H1 vs H2/H3 asset loading demo
- **Lifecycle animation** — visual compose → response phase tracker
- **Chunked encoding lab** — chunked wire Encode preset
- **HTTP/2 trailers & server push** — educational extra frames in Encode lab
- **TLS / ALPN panel** — certificate, cipher, ALPN from HTTPS Send socket
- **CONNECT tunnel lesson** — proxy CONNECT teaching panel
- **Learning paths (curriculum UI)** — guided presets per topic

---

## [0.3.0] — 2026-08-25

### Added

#### Phase 3 — Intercept / packet tools (educational scope)
- **Session traffic log** — intercept-style log of Sends in the current browser tab (`sessionStorage`)
- **Rewrite rules** — inject request headers and/or replace response body substring on live Send
- **Mock breakpoints** — pause on mock match; edit status/headers/body before resume
- **HAR 1.2 export** — Copy HAR from export bar after Send (Wireshark-adjacent workflow)
- **MITM lesson** panel — conceptual HTTPS MITM / CA install (no real system proxy)
- **Capture guide** panel — Wireshark / qvis workflow with exported HAR
- `lib/learn/traffic-log.ts`, `lib/learn/rewrite.ts`, `lib/learn/har.ts`
- UI: `RewritePanel`, `TrafficLogPanel`, `BreakpointModal`, `MitmLesson`, `CaptureGuidePanel`

### Changed
- Mock rules support editable response headers/body and **Breakpoint** checkbox
- Export bar includes **Copy HAR** when a Send log is available
- Lifecycle panel shows rewrite badge when response was modified

---

## [0.2.0] — 2026-08-25

### Added

#### Phase 1 — Educational UX
- **Request editor tabs:** Params, Auth, Import (raw HTTP, curl, OpenAPI)
- **Query params UI** — add/toggle parameters; stable row ids while typing
- **Auth helpers** — Basic, Bearer, API key (header or query)
- **Raw HTTP paste parser** and **curl import**
- **Set-Cookie teaching panel** on Response tab (`lib/learn/cookies.ts`)
- **Redirect chain** — optional Follow redirects (HTTP/1.x) + presets
- **Response callouts** — status teaching, 3xx + Location, timing breakdown
- **Multiplex lesson** panel (H1 vs H2 vs H3)
- Presets: **Lab: Redirect (302)**, **Lab: Set-Cookie response**
- [ROADMAP.md](./ROADMAP.md) with Phase 1–4 checklists

#### Phase 2 — API client features (local-only)
- **Collections / folders** — save/load requests in `localStorage`
- **Environments** — `{{var}}` substitution (`lib/env/substitute.ts`)
- **Assertions** — post-response status / header / body checks (no JS sandbox)
- **Code generation** — Python `requests`, axios, Go (+ curl, fetch, raw)
- **Protocol selector** — GraphQL, WebSocket relay, SSE, gRPC gateway POST, MQTT bridge
- **Multipart form-data** — field builder with generated boundary
- **Mock server** — local rules matched on Send without network
- **Share URL** — base64 request in `#share=` hash
- **CI export** — Postman collection JSON + bash curl script
- **OpenAPI 3 import** — paths → collection + load first operation
- API routes: `/api/ws`, `/api/mqtt`
- Dependencies: `ws`, `mqtt`

### Changed
- `app/page.tsx` — environments, collections, assertions, mock panels; share-from-hash on load
- `lib/clients/index.ts` — protocol dispatch, mock path, assertions on response
- `lib/clients/http1.ts` — redirect following, connect/TTFB timing
- `components/RequestEditor.tsx` — protocol, body type, multipart, GraphQL variables
- `components/LearningLog.tsx` — assertions results, protocol notes
- `components/ExportBar.tsx` — extended codegen buttons
- README — Phase 1/2 features, storage keys, editor tabs, stack

---

## [0.1.1] — 2026-08-25

### Added

#### Duplicate header validation
- **Validate** warns when the same header name appears more than once (case-insensitive)
- Version-specific issue codes:
  - `duplicate_header_http1` — HTTP/1.x may send multiple lines; servers may combine or pick one
  - `duplicate_header_h2h3` — H2/H3 Send keeps the **last** value; message includes line numbers and winning value
- Validation panel **Duplicate headers detected** callout (yellow banner) with short explanation
- RFC/MDN doc links on duplicate-header issues
- Presets: **Lab: Duplicate Accept (1.1)**, **(H2)**, **(H3)**

#### Documentation
- README: duplicate headers section, validation table, updated learning path

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

#### HTTP/1.0 and HTTP/1.1
- Text wire encode; live send via Node `http` / `https`
- **Send anyway** + missing `Host`: `setHost: false`
- **Actually sent** panel

#### HTTP/2
- Live send via Node `http2`; HPACK frames; Compare 1.1 vs 2

#### HTTP/3
- `@currentspace/http3` + curl fallback; QPACK frames; QUIC timeline; Compare 1.1/2 vs 3

### Dependencies (notable)
- `next`, `react`, `react-dom`, `@currentspace/http3`
- Optional: system `curl` with HTTP3
