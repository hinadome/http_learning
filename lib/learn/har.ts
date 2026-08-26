import type { ComposedRequest, LearningLog } from "../types";

export function toHar(log: LearningLog, request: ComposedRequest): string {
  const res = log.response;
  const started = Date.now() - log.timing.totalMs;
  const entry = {
    log: {
      version: "1.2",
      creator: { name: "HTTP Learning Checker", version: "0.4.1" },
      entries: [
        {
          startedDateTime: new Date(started).toISOString(),
          time: log.timing.totalMs,
          request: {
            method: request.method,
            url: request.url,
            httpVersion: `HTTP/${request.version}`,
            headers: request.headerText
              .split("\n")
              .filter(Boolean)
              .map((line) => {
                const i = line.indexOf(":");
                return {
                  name: line.slice(0, i).trim(),
                  value: line.slice(i + 1).trim(),
                };
              }),
            queryString: [],
            headersSize: -1,
            bodySize: new TextEncoder().encode(request.body || "").length,
            postData: request.body
              ? { mimeType: "text/plain", text: request.body }
              : undefined,
          },
          response: res
            ? {
                status: res.status,
                statusText: res.statusText,
                httpVersion: res.httpVersionNegotiated ?? "HTTP/1.1",
                headers: Object.entries(res.headers).flatMap(([name, value]) =>
                  (Array.isArray(value) ? value : [value]).map((v) => ({
                    name,
                    value: String(v),
                  }))
                ),
                content: {
                  size: res.sizeBytes,
                  mimeType:
                    (typeof res.headers["content-type"] === "string"
                      ? res.headers["content-type"]
                      : undefined) ?? "text/plain",
                  text: res.body,
                },
                headersSize: -1,
                bodySize: res.sizeBytes,
              }
            : {
                status: 0,
                statusText: log.error ?? "Failed",
                httpVersion: "",
                headers: [],
                content: { size: 0, mimeType: "text/plain", text: "" },
                headersSize: -1,
                bodySize: 0,
              },
          cache: {},
          timings: {
            send: 0,
            wait: log.timing.ttfbMs ?? 0,
            receive: Math.max(0, log.timing.totalMs - (log.timing.ttfbMs ?? 0)),
          },
        },
      ],
    },
  };
  return JSON.stringify(entry, null, 2);
}
