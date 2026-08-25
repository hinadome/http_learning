import type { CollectionEntry } from "../types";
import type { ComposedRequest } from "../types";

export interface OpenApiOperation {
  name: string;
  method: string;
  url: string;
  request: ComposedRequest;
}

interface OpenApiDoc {
  openapi?: string;
  swagger?: string;
  servers?: Array<{ url: string }>;
  paths?: Record<
    string,
    Record<
      string,
      {
        summary?: string;
        operationId?: string;
        parameters?: Array<{ name: string; in: string; example?: string }>;
      }
    >
  >;
}

export function importOpenApi(
  text: string,
  defaultHost?: string
): OpenApiOperation[] | { error: string } {
  let doc: OpenApiDoc;
  try {
    doc = JSON.parse(text) as OpenApiDoc;
  } catch {
    return { error: "Invalid JSON — paste OpenAPI 3.x JSON (YAML not supported yet)." };
  }

  if (!doc.paths) return { error: "No paths found in OpenAPI document." };

  const base =
    doc.servers?.[0]?.url?.replace(/\/$/, "") ||
    defaultHost?.replace(/\/$/, "") ||
    "https://api.example.com";

  const ops: OpenApiOperation[] = [];

  for (const [path, methods] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(method)) {
        continue;
      }
      const url = `${base}${path}`;
      let host = "";
      try {
        host = new URL(url).host;
      } catch {
        continue;
      }
      const name = op.summary || op.operationId || `${method.toUpperCase()} ${path}`;
      const queryParams = (op.parameters ?? [])
        .filter((p) => p.in === "query" && p.example != null)
        .map((p) => `${p.name}=${encodeURIComponent(String(p.example))}`)
        .join("&");
      const fullUrl = queryParams
        ? `${url}${url.includes("?") ? "&" : "?"}${queryParams}`
        : url;

      const request: ComposedRequest = {
        version: "1.1",
        method: method.toUpperCase(),
        url: fullUrl,
        headerText: `Host: ${host}\nAccept: application/json\nUser-Agent: HTTP-Learning-Checker/1.0`,
        body: "",
        protocol: "http",
        bodyType: "none",
      };

      ops.push({ name, method: method.toUpperCase(), url: fullUrl, request });
    }
  }

  if (ops.length === 0) return { error: "No HTTP operations found in paths." };
  return ops;
}

export function openApiToCollectionEntries(
  ops: OpenApiOperation[]
): CollectionEntry[] {
  return ops.map((op) => ({
    id: `col-oa-${op.name}-${Math.random().toString(36).slice(2, 6)}`,
    name: op.name,
    request: op.request,
  }));
}
