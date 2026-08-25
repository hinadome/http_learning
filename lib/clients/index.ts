import { encodeRequest } from "../encode";
import { sendHttp1 } from "./http1";
import { sendHttp2 } from "./http2";
import { sendHttp3 } from "./http3";
import { validateRequest } from "../validate/rules";
import type {
  ComposedRequest,
  LearningLog,
  LifecycleStep,
} from "../types";

export async function executeRequest(
  req: ComposedRequest
): Promise<LearningLog> {
  const t0 = Date.now();
  const steps: LifecycleStep[] = [];
  const validation = validateRequest(req);

  steps.push({
    id: "compose",
    label: "Compose request from UI input",
    status: "ok",
    detail: `${req.method} ${req.url} (HTTP/${req.version})`,
  });

  steps.push({
    id: "validate",
    label: "Validate headers for HTTP version",
    status: validation.ok ? "ok" : "error",
    detail: validation.ok
      ? `${validation.issues.length} note(s)`
      : validation.issues
          .filter((i) => i.severity === "error")
          .map((i) => i.message)
          .join("; "),
  });

  let encode = encodeRequest(req);
  steps.push({
    id: "encode",
    label:
      req.version === "2" || req.version === "3"
        ? "Encode frames / header compression (educational)"
        : "Build HTTP/1.x wire message",
    status: "ok",
    detail: `${encode.frames.length} frame(s)/block(s)`,
  });

  if (!validation.ok && !req.sendAnyway) {
    return {
      steps,
      validation,
      encode,
      error:
        "Validation failed. Fix errors or enable “Send anyway” to try the request for learning.",
      timing: { totalMs: Date.now() - t0 },
    };
  }

  try {
    if (req.version === "1.0" || req.version === "1.1") {
      const { response, sent } = await sendHttp1(req, steps);
      // Prefer actual sent wire in the encode view after a live send
      if (sent.wireText) {
        encode = {
          ...encode,
          textWire: sent.wireText,
          textWireHex: sent.wireHex,
          notes: [
            ...encode.notes,
            ...sent.notes,
            "Updated after Send: text wire matches headers actually written (see Also: curl).",
          ],
        };
      }
      return {
        steps,
        validation,
        encode,
        response,
        sent,
        timing: {
          totalMs: Date.now() - t0,
          ttfbMs: steps.find((s) => s.id === "read")?.durationMs,
        },
      };
    }
    if (req.version === "2") {
      const { response, sent } = await sendHttp2(req, steps);
      return {
        steps,
        validation,
        encode,
        response,
        sent,
        timing: {
          totalMs: Date.now() - t0,
          ttfbMs: steps.find((s) => s.id === "read")?.durationMs,
        },
      };
    }
    const { response, sent } = await sendHttp3(req, steps);
    if (encode.quicTimeline?.length) {
      for (const q of encode.quicTimeline) {
        if (!steps.some((s) => s.id === q.id)) steps.push(q);
      }
    }
    return {
      steps,
      validation,
      encode: {
        ...encode,
        quicTimeline: encode.quicTimeline?.map((s) =>
          s.id === "alt-svc"
            ? {
                ...s,
                status: sent.altSvc ? ("ok" as const) : ("skip" as const),
                detail: sent.altSvc
                  ? `Observed Alt-Svc: ${sent.altSvc}`
                  : s.detail,
              }
            : s.id === "h3-transport"
              ? {
                  ...s,
                  status: "ok" as const,
                  detail:
                    sent.transport === "currentspace"
                      ? "Live send via @currentspace/http3 (QUIC)"
                      : sent.transport === "curl"
                        ? "Live send via curl --http3"
                        : s.detail,
                }
              : s
        ),
      },
      response,
      sent,
      timing: {
        totalMs: Date.now() - t0,
        ttfbMs: steps.find((s) => s.id === "read")?.durationMs,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    steps.push({
      id: "error",
      label: "Request failed",
      status: "error",
      detail: message,
    });
    return {
      steps,
      validation,
      encode,
      error: message,
      timing: { totalMs: Date.now() - t0 },
    };
  }
}
