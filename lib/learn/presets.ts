import type { ComposedRequest, HttpVersion } from "../types";

export interface Preset {
  id: string;
  title: string;
  description: string;
  request: ComposedRequest;
}

function base(
  partial: Partial<ComposedRequest> &
    Pick<ComposedRequest, "method" | "url" | "headerText">
): ComposedRequest {
  return {
    version: (partial.version || "1.1") as HttpVersion,
    method: partial.method,
    url: partial.url,
    headerText: partial.headerText,
    body: partial.body ?? "",
    allowPrivateTargets: false,
    sendAnyway: false,
    followRedirects: partial.followRedirects ?? false,
    maxRedirects: partial.maxRedirects ?? 5,
    protocol: partial.protocol ?? "http",
    bodyType: partial.bodyType ?? "text",
    graphqlVariables: partial.graphqlVariables ?? "{}",
    multipartFields: partial.multipartFields ?? [],
    encodeLab: partial.encodeLab,
  };
}

export const PRESETS: Preset[] = [
  {
    id: "httpbin-get",
    title: "httpbin GET",
    description: "Valid HTTP/1.1 GET with Host and Accept.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Host: httpbin.org
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "missing-host",
    title: "Lab: Missing Host (1.1)",
    description: "Omits Host — validation should fail for HTTP/1.1.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Accept: */*
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "post-json",
    title: "POST JSON",
    description: "POST with Content-Type and body.",
    request: base({
      version: "1.1",
      method: "POST",
      url: "https://httpbin.org/post",
      headerText: `Host: httpbin.org
Content-Type: application/json
Accept: application/json`,
      body: '{\n  "hello": "world"\n}',
    }),
  },
  {
    id: "post-no-cl",
    title: "Lab: POST without Content-Length",
    description: "Body present but no Content-Length — warning, app may inject on send.",
    request: base({
      version: "1.1",
      method: "POST",
      url: "https://httpbin.org/post",
      headerText: `Host: httpbin.org
Content-Type: text/plain`,
      body: "payload",
    }),
  },
  {
    id: "get-with-body",
    title: "Lab: GET with body",
    description: "Unusual GET + body — expect a warning.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Host: httpbin.org
Content-Type: text/plain`,
      body: "should-not-matter",
    }),
  },
  {
    id: "http2-get",
    title: "HTTP/2 GET",
    description: "Same GET for HTTP/2 — inspect pseudo-headers and HPACK frames.",
    request: base({
      version: "2",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "http3-get",
    title: "HTTP/3 GET (Cloudflare)",
    description: "h3-capable target — try Send for live QUIC when transport is available.",
    request: base({
      version: "3",
      method: "GET",
      url: "https://cloudflare.com/",
      headerText: `Accept: text/html
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "http3-www-cf",
    title: "Lab: H3-only style target",
    description: "www.cloudflare.com often speaks HTTP/3 — inspect Alt-Svc after Send.",
    request: base({
      version: "3",
      method: "GET",
      url: "https://www.cloudflare.com/",
      headerText: `Accept: text/html
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "http3-authority-from-url",
    title: "Lab: H3 :authority from URL",
    description: "No Host header — Encode still sets :authority from the URL (not Host).",
    request: base({
      version: "3",
      method: "GET",
      url: "https://cloudflare.com/",
      headerText: `Accept: */*
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "http3-forbidden-connection",
    title: "Lab: Connection header on H3",
    description: "Connection is forbidden in HTTP/3 — validation error.",
    request: base({
      version: "3",
      method: "GET",
      url: "https://cloudflare.com/",
      headerText: `Connection: keep-alive
Accept: */*`,
    }),
  },
  {
    id: "lesson-hpack-qpack",
    title: "Lesson: HPACK vs QPACK",
    description: "Same logical GET — use Compare 2 vs 3 to study HPACK vs QPACK side by side.",
    request: base({
      version: "2",
      method: "GET",
      url: "https://cloudflare.com/",
      headerText: `Accept: text/html
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "duplicate-accept-h2",
    title: "Lab: Duplicate Accept (H2)",
    description:
      "Two Accept lines — Validate warns; Send keeps the last value only.",
    request: base({
      version: "2",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Accept: application/json
Accept: text/html
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "duplicate-accept-h3",
    title: "Lab: Duplicate Accept (H3)",
    description:
      "Same duplicate-header lesson on HTTP/3 — last value wins on Send.",
    request: base({
      version: "3",
      method: "GET",
      url: "https://cloudflare.com/",
      headerText: `Accept: text/html
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "duplicate-accept-http11",
    title: "Lab: Duplicate Accept (1.1)",
    description:
      "HTTP/1.1 may send both lines; servers may combine or pick one.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Host: httpbin.org
Accept: application/json
Accept: text/html
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "h2-forbidden-connection",
    title: "Lab: Connection header on H2",
    description: "Connection is forbidden in HTTP/2 — validation error.",
    request: base({
      version: "2",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Connection: keep-alive
Accept: */*`,
    }),
  },
  {
    id: "redirect-302",
    title: "Lab: Redirect (302)",
    description:
      "httpbin /redirect/2 — Send without follow to see 302 + Location; enable Follow redirects to see chain.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/redirect/2",
      headerText: `Host: httpbin.org
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
      followRedirects: false,
    }),
  },
  {
    id: "set-cookie-response",
    title: "Lab: Set-Cookie response",
    description:
      "httpbin /cookies/set — Send without follow redirects to see 302 + Set-Cookie on Response. (Follow redirects shows empty cookies — Node has no cookie jar.)",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/cookies/set?session=abc123&theme=dark",
      headerText: `Host: httpbin.org
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
      followRedirects: false,
    }),
  },
  {
    id: "websocket-echo",
    title: "WebSocket echo",
    description:
      "wss://echo.websocket.org — Send opens relay, optional outbound message echoed back.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "wss://echo.websocket.org",
      headerText: "",
      protocol: "websocket",
      wsOutboundMessage: "Hello",
    }),
  },
  {
    id: "chunked-encoding",
    title: "Lab: Chunked encoding",
    description:
      "Transfer-Encoding: chunked — Encode to see chunked wire format.",
    request: base({
      version: "1.1",
      method: "POST",
      url: "https://httpbin.org/post",
      headerText: `Host: httpbin.org
Content-Type: text/plain
Transfer-Encoding: chunked`,
      body: "chunked payload",
      encodeLab: "chunked",
    }),
  },
  {
    id: "h2-trailers",
    title: "Lab: H2 trailers encode",
    description: "HTTP/2 trailing HEADERS frame after DATA (Encode tab).",
    request: base({
      version: "2",
      method: "POST",
      url: "https://httpbin.org/post",
      headerText: `Content-Type: application/json
Accept: application/json`,
      body: '{"trailers": true}',
      encodeLab: "h2-trailers",
    }),
  },
  {
    id: "h2-push",
    title: "Lab: H2 server push encode",
    description: "Educational PUSH_PROMISE frame in Encode view.",
    request: base({
      version: "2",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Accept: text/html
User-Agent: HTTP-Learning-Checker/1.0`,
      encodeLab: "h2-push",
    }),
  },
];
