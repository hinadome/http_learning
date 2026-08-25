import type { ComposedRequest, MultipartField } from "../types";

export function newMultipartFieldId(): string {
  return `mp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function buildMultipartBody(fields: MultipartField[]): {
  body: string;
  contentType: string;
  boundary: string;
} {
  const boundary = `----HttpLearningChecker${Date.now().toString(16)}`;
  const parts: string[] = [];
  for (const f of fields) {
    if (!f.enabled || !f.name.trim()) continue;
    parts.push(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${f.name.trim()}"\r\n\r\n` +
        `${f.value}\r\n`
    );
  }
  parts.push(`--${boundary}--\r\n`);
  return {
    body: parts.join(""),
    contentType: `multipart/form-data; boundary=${boundary}`,
    boundary,
  };
}

export function upsertHeader(
  headerText: string,
  name: string,
  value: string
): string {
  const lines = headerText.split("\n").filter((l) => {
    const lower = l.toLowerCase();
    return !lower.startsWith(`${name.toLowerCase()}:`);
  });
  lines.push(`${name}: ${value}`);
  return lines.join("\n");
}

export function prepareRequestForSend(req: ComposedRequest): {
  request: ComposedRequest;
  notes: string[];
} {
  const notes: string[] = [];
  let r = { ...req };
  const protocol = req.protocol ?? "http";

  if (protocol === "graphql") {
    const query = r.body.trim();
    let variables: unknown = {};
    if (r.graphqlVariables?.trim()) {
      try {
        variables = JSON.parse(r.graphqlVariables);
      } catch {
        notes.push("GraphQL variables JSON invalid — using {}.");
      }
    }
    r.method = "POST";
    r.body = JSON.stringify({ query, variables }, null, 2);
    r.headerText = upsertHeader(
      upsertHeader(r.headerText, "Content-Type", "application/json"),
      "Accept",
      "application/json"
    );
    notes.push("GraphQL: wrapped body as { query, variables } JSON POST.");
  }

  if (protocol === "sse") {
    r.method = r.method === "POST" ? "GET" : r.method;
    r.headerText = upsertHeader(r.headerText, "Accept", "text/event-stream");
    notes.push("SSE: Accept set to text/event-stream (long-lived HTTP response).");
  }

  if (protocol === "websocket") {
    notes.push(
      "WebSocket: Send opens a short relay via /api/ws (not a browser WebSocket). See response for frames received."
    );
  }

  if (protocol === "grpc") {
    r.method = "POST";
    r.version = r.version === "1.0" ? "1.1" : r.version === "3" ? "2" : r.version;
    r.headerText = upsertHeader(
      r.headerText,
      "Content-Type",
      "application/json"
    );
    notes.push(
      "gRPC (educational): sent as HTTP POST JSON (grpc-gateway / grpc-web style). Native gRPC binary framing requires dedicated clients."
    );
  }

  if (protocol === "mqtt") {
    notes.push(
      "MQTT: publish via /api/mqtt bridge (MQTT is not HTTP — this lab shows the gateway pattern)."
    );
  }

  const bodyType = req.bodyType ?? (req.body ? "text" : "none");

  if (bodyType === "multipart" && req.multipartFields?.length) {
    const { body, contentType } = buildMultipartBody(req.multipartFields);
    r.body = body;
    r.headerText = upsertHeader(r.headerText, "Content-Type", contentType);
    if (r.method === "GET") r.method = "POST";
    notes.push("Multipart: built form-data body with generated boundary.");
  }

  if (bodyType === "json" && r.body.trim()) {
    r.headerText = upsertHeader(r.headerText, "Content-Type", "application/json");
  }

  return { request: r, notes };
}
