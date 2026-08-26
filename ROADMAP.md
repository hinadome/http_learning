# Roadmap

Feature gaps vs similar tools ([How HTTP Works](https://howhttpworks.com/tools), [Hoppscotch](https://hoppscotch.io/), [HTTP Toolkit](https://httptoolkit.com/), [h2-h3-multiplex-lab](https://github.com/network-priority/h2-h3-multiplex-lab)). Check marks reflect what is implemented in this repo.

---

## Phase 1 — Educational gaps (priority)

- [x] **Raw HTTP paste parser** — paste a request message → populate method, URL, headers, body
- [x] **Import from curl** — parse common `curl` flags into the editor
- [x] **Query params UI** — add/toggle query parameters separately from the URL bar
- [x] **Auth helpers** — Basic, Bearer, API key → `Authorization` header
- [x] **Set-Cookie / Cookie teaching** — parse `Set-Cookie`, explain attributes, browser-send verdict
- [x] **Redirect chain lab** — preset + optional follow redirects + chain in response panel
- [x] **Status code + response header callouts** — richer response teaching (3xx + Location, Set-Cookie highlight)
- [x] **Response timing breakdown** — DNS / connect / TTFB / total in lifecycle panel
- [x] **H1 vs H2 vs H3 multiplex lesson** — static teaching panel (connection limits, HOL blocking)

---

## Phase 2 — API client features

- [x] **Collections / folders** — save/load requests in `localStorage`, optional folders
- [x] **Environment variables** — `{{var}}` substitution in URL, headers, body before Send
- [x] **Pre/post-request scripts and assertions** — post-response assertions (status, header, body); env vars replace pre-request scripts
- [x] **Code generation** — Python `requests`, axios, Go, fetch, curl, raw HTTP/1.x
- [x] **GraphQL / gRPC / WebSocket / SSE / MQTT** — protocol selector: GraphQL POST, WS relay, SSE Accept, gRPC gateway POST, MQTT bridge
- [x] **Multipart form-data and file upload UI** — form field builder (text fields; educational multipart body)
- [x] **Mock servers** — local mock rules, match on Send without network
- [x] **Cloud sync / share URL / team workspaces** — **Share URL** (base64 in hash, no account); team cloud sync out of scope
- [x] **CI runners** — export Postman collection JSON + bash curl script from collections
- [x] **OpenAPI import** — paste OpenAPI 3 JSON → collection + first operation loaded

---

## Phase 3 — Intercept / packet tools (different product class)

- [x] **Live traffic interception (browser, mobile, Docker)** — **partial:** session traffic log for app Sends only (not system-wide)
- [x] **Breakpoints / edit in-flight traffic** — **partial:** mock breakpoint modal (edit response before display)
- [x] **Mock/rewrite rules on proxied traffic** — rewrite rules on live Send + existing mock server
- [x] **HTTPS MITM with user-installed CA** — **teaching panel only** (`MitmLesson`; no real system MITM)
- [x] **Real QUIC capture (qvis / Wireshark integration)** — **guide panel + HAR export** (`CaptureGuidePanel`; no live qvis)

---

## Phase 4 — Deeper protocol labs

- [x] **Interactive multiplex load simulator (animated asset loading)** — `MultiplexSimulator`
- [x] **HTTP/2 trailers lab** — Encode lab preset + trailing HEADERS frame
- [x] **Server Push (H2) educational encode** — PUSH_PROMISE in Encode lab
- [x] **Chunked encoding live round-trip lab** — chunked wire Encode + preset (Send uses Content-Length unless TE set)
- [x] **TLS cert / ALPN / cipher inspection panel** — `TlsPanel` from HTTPS Send socket
- [x] **CONNECT / proxy tunnel teaching** — `ConnectLesson` panel
- [x] **Guided step-by-step learning paths (curriculum UI)** — `CurriculumPanel`
- [x] **Lifecycle animation (visual request/response cycle)** — `LifecycleAnimation`
- [x] **Dark mode** — CSS variables + `ThemeToggle`

---

## Phase 1 review checklist

1. **Import** tab → paste raw HTTP or curl → Apply
2. **Params** tab → toggle a query param → URL updates
3. **Auth** tab → Bearer token → `Authorization` header appears
4. Preset **Lab: Redirect (302)** → Send without follow → see 302 callout
5. Enable **Follow redirects** → Send → redirect chain in Response tab
6. Preset **Lab: Set-Cookie response** → Follow redirects **off** → Set-Cookie teaching on Response tab (302). Follow redirects → empty cookies JSON is expected (no cookie jar).
7. **Compare 2 vs 3** + **Multiplex lesson** panel

---

## Phase 2 review checklist

1. **Collections** — Save current request → reload from list
2. **Environments** — set `baseUrl` → use `{{baseUrl}}/get` in URL → Send
3. **Assertions** — add status `200` → Send → see pass/fail on Response tab
4. **Export** — Copy Python / axios / Go from export bar
5. **GraphQL** — protocol GraphQL, query in body → Send
6. **WebSocket** — preset **WebSocket echo** or `wss://echo.websocket.org` → Send (live frames)
7. **Multipart** — body type multipart, add fields → Send to httpbin.org/post
8. **Mock** — create rule, enable Use mock → Send (no network)
9. **Share URL** — copy link, open in new tab → request restored
10. **OpenAPI** — Import tab → paste minimal OpenAPI JSON
11. **CI** — Collections → Copy Postman JSON or Copy CI shell
12. **GraphQL** — Protocol GraphQL → body type becomes GraphQL → Send

---

## Phase 3 review checklist

1. **Session traffic** — Send twice → entries appear in Session traffic panel
2. **Rewrite** — add rule (inject header or body replace) → Send → see rewrite badge + lifecycle note
3. **Mock breakpoint** — enable Breakpoint on mock rule → Use mock → Send → edit in modal → Resume
4. **HAR export** — after Send → Copy har from export bar → open in HAR viewer or Wireshark import
5. **MITM lesson** — read MitmLesson panel (conceptual; app does not install a CA)
6. **Capture guide** — read CaptureGuidePanel for Wireshark / qvis workflow with exported HAR

---

## Phase 4 review checklist

1. **Dark mode** — toggle in header → theme persists on reload
2. **Multiplex simulator** — H1 vs H2 vs H3 → Simulate load
3. **Chunked lab** — preset → Encode → chunked wire on Wire tab
4. **H2 trailers / push** — lab presets → Encode → extra frames
5. **TLS panel** — HTTPS Send → ALPN + cert details below lifecycle
6. **Learning paths** — Curriculum panel → Load preset per step
7. **Lifecycle animation** — Validate / Send → phase highlights update
8. **CONNECT lesson** — read ConnectLesson panel
