import { encodeRequest } from "../encode";
import { sendHttp1 } from "./http1";
import { sendHttp2 } from "./http2";
import { sendHttp3 } from "./http3";
import { validateRequest } from "../validate/rules";
import { prepareRequestForSend } from "../request/prepare";
import { executeMockRule, matchMockRule } from "../learn/mock";
import { runAssertions } from "../learn/assertions";
import { relayWebSocket } from "./ws-relay";
import { publishMqtt } from "./mqtt-bridge";
import type {
  ComposedRequest,
  LearningLog,
  LifecycleStep,
  MockRule,
  SendResponse,
} from "../types";

export interface ExecuteOptions {
  mockRules?: MockRule[];
}

async function sendWebSocketRelay(
  req: ComposedRequest,
  steps: LifecycleStep[]
): Promise<{ response: SendResponse; notes: string[] }> {
  steps.push({
    id: "ws-connect",
    label: "WebSocket relay connect",
    status: "ok",
    detail: req.url,
  });

  const data = await relayWebSocket({
    url: req.url,
    message: req.wsOutboundMessage,
    allowPrivateTargets: req.allowPrivateTargets,
  });

  if (data.error && data.frameCount === 0) {
    throw new Error(data.error);
  }

  const body = data.messages.join("\n---\n") || "(no inbound frames)";
  steps.push({
    id: "read",
    label: "Collect WebSocket frames",
    status: "ok",
    detail: `${data.frameCount} message(s)`,
  });

  return {
    notes: data.notes,
    response: {
      status: 101,
      statusText: "Switching Protocols (simulated)",
      headers: {
        "sec-websocket-accept": "(relay)",
        "x-frame-count": String(data.frameCount),
      },
      body,
      bodyTruncated: false,
      sizeBytes: new TextEncoder().encode(body).length,
      httpVersionNegotiated: "WebSocket",
    },
  };
}

async function sendMqttBridge(
  req: ComposedRequest,
  steps: LifecycleStep[]
): Promise<{ response: SendResponse; notes: string[] }> {
  steps.push({
    id: "mqtt-bridge",
    label: "MQTT publish bridge",
    status: "ok",
    detail: req.mqttTopic ?? "(topic)",
  });

  const data = await publishMqtt({
    broker: req.url,
    topic: req.mqttTopic ?? "test/topic",
    message: req.body || req.wsOutboundMessage || "",
  });

  const body = JSON.stringify(
    {
      published: data.published,
      broker: req.url,
      topic: req.mqttTopic,
      error: data.error,
      notes: data.notes,
    },
    null,
    2
  );

  return {
    notes: data.notes,
    response: {
      status: data.published ? 200 : data.error ? 502 : 200,
      statusText: data.published ? "Published" : "Bridge",
      headers: { "content-type": "application/json" },
      body,
      bodyTruncated: false,
      sizeBytes: body.length,
      httpVersionNegotiated: "MQTT/bridge",
    },
  };
}

function mockToSendResponse(mock: ReturnType<typeof executeMockRule>): SendResponse {
  return {
    ...mock,
    bodyTruncated: false,
    sizeBytes: new TextEncoder().encode(mock.body).length,
    httpVersionNegotiated: "HTTP/1.1 (mock)",
  };
}

export async function executeRequest(
  rawReq: ComposedRequest,
  options: ExecuteOptions = {}
): Promise<LearningLog> {
  const t0 = Date.now();
  const steps: LifecycleStep[] = [];
  const { request: req, notes: prepareNotes } = prepareRequestForSend(rawReq);
  const protocolNotes = [...prepareNotes];
  const protocol = rawReq.protocol ?? "http";

  steps.push({
    id: "compose",
    label: "Compose request from UI input",
    status: "ok",
    detail: `${req.method} ${req.url} (${protocol}, HTTP/${req.version})`,
  });

  const validation = validateRequest(req);
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
      protocolNotes,
      error:
        "Validation failed. Fix errors or enable “Send anyway” to try the request for learning.",
      timing: { totalMs: Date.now() - t0 },
    };
  }

  try {
    if (req.useMock && options.mockRules?.length) {
      const rule = matchMockRule(options.mockRules, req.mockRuleId, req);
      if (!rule) {
        throw new Error("No mock rule matched this request.");
      }
      steps.push({
        id: "mock",
        label: "Mock server matched rule",
        status: "ok",
        detail: rule.name,
      });
      const mock = executeMockRule(rule);
      const response = mockToSendResponse(mock);
      const assertionResults = runAssertions(rawReq.assertions, response);
      return {
        steps,
        validation,
        encode,
        response,
        protocolNotes: [...protocolNotes, `Mock: ${rule.name}`],
        assertionResults,
        timing: { totalMs: Date.now() - t0 },
      };
    }

    if (protocol === "websocket") {
      const { response, notes } = await sendWebSocketRelay(req, steps);
      const assertionResults = runAssertions(rawReq.assertions, response);
      return {
        steps,
        validation,
        encode,
        response,
        protocolNotes: [...protocolNotes, ...notes],
        assertionResults,
        timing: { totalMs: Date.now() - t0 },
      };
    }

    if (protocol === "mqtt") {
      const { response, notes } = await sendMqttBridge(req, steps);
      const assertionResults = runAssertions(rawReq.assertions, response);
      return {
        steps,
        validation,
        encode,
        response,
        protocolNotes: [...protocolNotes, ...notes],
        assertionResults,
        timing: { totalMs: Date.now() - t0 },
      };
    }

    if (req.version === "1.0" || req.version === "1.1") {
      const { response, sent, redirectChain, finalUrl, timingExtra } =
        await sendHttp1(req, steps);
      if (sent.wireText) {
        encode = {
          ...encode,
          textWire: sent.wireText,
          textWireHex: sent.wireHex,
          notes: [
            ...encode.notes,
            ...sent.notes,
            "Updated after Send: text wire matches headers actually written.",
          ],
        };
      }
      if (protocol === "sse") {
        protocolNotes.push(
          "SSE response may stream; body shows first chunk captured (size cap applies)."
        );
      }
      const assertionResults = runAssertions(rawReq.assertions, response);
      return {
        steps,
        validation,
        encode,
        response,
        sent,
        redirectChain,
        finalUrl,
        protocolNotes,
        assertionResults,
        timing: {
          totalMs: Date.now() - t0,
          connectMs: timingExtra?.connectMs,
          ttfbMs: timingExtra?.ttfbMs,
        },
      };
    }

    if (req.version === "2") {
      const { response, sent } = await sendHttp2(req, steps);
      const assertionResults = runAssertions(rawReq.assertions, response);
      return {
        steps,
        validation,
        encode,
        response,
        sent,
        protocolNotes,
        assertionResults,
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
    const assertionResults = runAssertions(rawReq.assertions, response);
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
      protocolNotes,
      assertionResults,
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
      protocolNotes,
      error: message,
      timing: { totalMs: Date.now() - t0 },
    };
  }
}
