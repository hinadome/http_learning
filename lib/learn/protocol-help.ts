import type { DocRef, RequestProtocol } from "../types";

export interface ProtocolHelp {
  title: string;
  summary: string;
  prepare: string;
  validate: string;
  send: string;
  urlHint?: string;
  /** Spec / tutorial links for further reading when this protocol is selected. */
  docs: DocRef[];
}

export const PROTOCOL_HELP: Record<RequestProtocol, ProtocolHelp> = {
  http: {
    title: "HTTP / REST",
    summary:
      "Standard request/response over HTTP. The backend uses your chosen HTTP version (1.0–3) for validation and the matching Node client on Send.",
    prepare:
      "Multipart and JSON body types may inject Content-Type; otherwise headers and body are sent as typed.",
    validate:
      "Full HTTP version rules apply: Host (1.1), forbidden Connection headers (2/3), Content-Length vs Transfer-Encoding, etc.",
    send:
      "HTTP/1.x → Node http/https; HTTP/2 → TLS + ALPN h2; HTTP/3 → QUIC (@currentspace/http3 or curl). Optional follow redirects on 1.x.",
    urlHint: "https://httpbin.org/get or http://example.com",
    docs: [
      {
        label: "MDN: HTTP overview",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP",
        source: "MDN",
      },
      {
        label: "RFC 9110 — HTTP Semantics",
        url: "https://www.rfc-editor.org/rfc/rfc9110",
        source: "RFC",
      },
      {
        label: "RFC 9112 — HTTP/1.1",
        url: "https://www.rfc-editor.org/rfc/rfc9112",
        source: "RFC",
      },
      {
        label: "RFC 9113 — HTTP/2",
        url: "https://www.rfc-editor.org/rfc/rfc9113",
        source: "RFC",
      },
      {
        label: "RFC 9114 — HTTP/3",
        url: "https://www.rfc-editor.org/rfc/rfc9114",
        source: "RFC",
      },
    ],
  },
  graphql: {
    title: "GraphQL",
    summary:
      "GraphQL over HTTP: the backend wraps your query body as JSON { query, variables } and sends a POST.",
    prepare:
      "Forces POST, sets Content-Type and Accept to application/json, builds body from query + variables fields.",
    validate:
      "Same HTTP header rules as your selected version (Host on 1.1, no Connection on 2/3, etc.) on the prepared request.",
    send:
      "Uses the normal HTTP client for your version — GraphQL is not a separate wire protocol here.",
    urlHint: "https://api.example.com/graphql",
    docs: [
      {
        label: "GraphQL over HTTP",
        url: "https://graphql.org/learn/serving-over-http/",
        source: "GraphQL",
      },
      {
        label: "GraphQL spec — Overview",
        url: "https://spec.graphql.org/October2021/",
        source: "Spec",
      },
      {
        label: "MDN: POST method",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/POST",
        source: "MDN",
      },
    ],
  },
  sse: {
    title: "Server-Sent Events (SSE)",
    summary:
      "Long-lived HTTP response with text/event-stream. The client sets Accept and reads the first response chunk.",
    prepare:
      "Sets Accept: text/event-stream. POST is downgraded to GET if you had POST selected.",
    validate:
      "HTTP version rules still apply to the outgoing HTTP request.",
    send:
      "HTTP/1.x (or H2/H3 if selected) — response body may stream; the app captures the first chunk (size cap applies).",
    urlHint: "https://example.com/events",
    docs: [
      {
        label: "MDN: Server-sent events",
        url: "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events",
        source: "MDN",
      },
      {
        label: "MDN: EventSource",
        url: "https://developer.mozilla.org/en-US/docs/Web/API/EventSource",
        source: "MDN",
      },
      {
        label: "HTML Living Standard — SSE",
        url: "https://html.spec.whatwg.org/multipage/server-sent-events.html",
        source: "WHATWG",
      },
    ],
  },
  grpc: {
    title: "gRPC (gateway style)",
    summary:
      "Educational JSON POST stand-in for grpc-gateway / gRPC-Web — not native binary gRPC framing.",
    prepare:
      "Forces POST, Content-Type application/json. HTTP version 1.0→1.1, 3→2 for the actual send path.",
    validate:
      "Validates the prepared HTTP request against your (possibly adjusted) version.",
    send:
      "Regular HTTPS POST via HTTP/1.1 or HTTP/2 client. Native gRPC requires HTTP/2 + protobuf + trailers.",
    urlHint: "https://api.example.com/v1/service/method",
    docs: [
      {
        label: "gRPC over HTTP/2",
        url: "https://grpc.io/docs/what-is-grpc/core-concepts/",
        source: "gRPC",
      },
      {
        label: "gRPC-Web",
        url: "https://grpc.io/docs/platforms/web/basics/",
        source: "gRPC",
      },
      {
        label: "grpc-gateway",
        url: "https://grpc-ecosystem.github.io/grpc-gateway/",
        source: "Docs",
      },
      {
        label: "RFC 9113 — HTTP/2 trailers",
        url: "https://www.rfc-editor.org/rfc/rfc9113#name-trailers",
        source: "RFC",
      },
    ],
  },
  websocket: {
    title: "WebSocket",
    summary:
      "Not HTTP on Send — the backend opens a WebSocket client relay and collects inbound text frames.",
    prepare:
      "Adds a teaching note only; does not rewrite URL or headers for HTTP.",
    validate:
      "HTTP Host and HTTP/2 wire rules are skipped. Generic header syntax checks still run.",
    send:
      "Skips HTTP clients → relayWebSocket(). URL must be ws: or wss:. Optional outbound message field.",
    urlHint: "wss://echo.websocket.org",
    docs: [
      {
        label: "MDN: The WebSocket API",
        url: "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API",
        source: "MDN",
      },
      {
        label: "MDN: Writing WebSocket client apps",
        url: "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications",
        source: "MDN",
      },
      {
        label: "RFC 6455 — The WebSocket Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc6455",
        source: "RFC",
      },
    ],
  },
  mqtt: {
    title: "MQTT (bridge)",
    summary:
      "MQTT is not HTTP — Send publishes via an MQTT client bridge to show the gateway pattern.",
    prepare:
      "Teaching note only. Topic from MQTT topic field; body = message payload.",
    validate:
      "HTTP Host and HTTP/2 wire rules are skipped. Generic header syntax checks still run.",
    send:
      "Skips HTTP → publishMqtt() to the broker URL. Connect timeout ~6s.",
    urlHint: "mqtt://test.mosquitto.org:1883",
    docs: [
      {
        label: "MQTT.org — Getting started",
        url: "https://mqtt.org/getting-started/",
        source: "MQTT",
      },
      {
        label: "OASIS MQTT 5.0",
        url: "https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html",
        source: "OASIS",
      },
      {
        label: "HiveMQ: MQTT Essentials",
        url: "https://www.hivemq.com/mqtt/",
        source: "Guide",
      },
    ],
  },
};

export function getProtocolHelp(
  protocol: RequestProtocol | undefined
): ProtocolHelp {
  return PROTOCOL_HELP[protocol ?? "http"];
}
