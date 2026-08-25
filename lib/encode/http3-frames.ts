import { getHeader, parseComposedRequest } from "../parse";
import type {
  ComposedRequest,
  EncodedFrame,
  EncodeResult,
  HpackEntry,
} from "../types";
import {
  bufferToAsciiPreview,
  bufferToHex,
  encodeHpackLiteral,
  findStaticIndex,
} from "./bytes";
import { getHttp2PseudoHeaders } from "./http2-frames";
import {
  buildQuicHandshakeTimeline,
  QUIC_LESSON_NOTES,
} from "../learn/quic-timeline";

const CONNECTION_SPECIFIC = new Set([
  "connection",
  "transfer-encoding",
  "upgrade",
  "keep-alive",
  "proxy-connection",
  "host",
]);

/** Encode a single HTTP/3 frame: type (varint) + length (varint) + payload — simplified. */
function encodeVarint(n: number): Buffer {
  if (n < 64) return Buffer.from([n]);
  if (n < 16384) {
    const b = Buffer.alloc(2);
    b.writeUInt16BE(n | 0x4000, 0);
    return b;
  }
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n | 0x80000000, 0);
  return b;
}

function h3Frame(type: number, payload: Buffer): Buffer {
  return Buffer.concat([encodeVarint(type), encodeVarint(payload.length), payload]);
}

export function encodeHttp3(req: ComposedRequest): EncodeResult {
  const parsed = parseComposedRequest(req);
  const pseudo = getHttp2PseudoHeaders(req);
  const qpack: HpackEntry[] = [];

  const fields: Array<[string, string]> = [
    [":method", pseudo[":method"]],
    [":scheme", pseudo[":scheme"]],
    [":authority", pseudo[":authority"]],
    [":path", pseudo[":path"]],
  ];

  for (const h of parsed.headers) {
    if (!h.name) continue;
    const lower = h.name.toLowerCase();
    if (CONNECTION_SPECIFIC.has(lower) || lower.startsWith(":")) continue;
    fields.push([lower, h.value]);
  }

  const blockParts: Buffer[] = [];
  blockParts.push(Buffer.from([0x00, 0x00]));

  for (const [name, value] of fields) {
    const lit = encodeHpackLiteral(name, value);
    blockParts.push(lit);
    qpack.push({
      name,
      value,
      encoding: name.startsWith(":") ? "pseudo" : "literal",
      staticIndex: findStaticIndex(name, value),
      plainBytes: Buffer.byteLength(`${name}: ${value}`, "utf8"),
      encodedHex: bufferToHex(lit),
      note:
        "Educational QPACK-style literal. Real QPACK uses a different static table and encoder/decoder streams.",
    });
  }

  const headersPayload = Buffer.concat(blockParts);
  const headersFrame = h3Frame(0x01, headersPayload);

  const frames: EncodedFrame[] = [
    {
      name: "QUIC CRYPTO / handshake (conceptual)",
      type: "QUIC",
      hex: bufferToHex(Buffer.from("QUIC handshake + TLS 1.3 (not shown)")),
      annotations: [],
      explanation:
        "HTTP/3 runs over QUIC (UDP). TLS 1.3 is integrated into the QUIC handshake — there is no separate TCP+TLS layering.",
    },
    {
      name: "HEADERS (HTTP/3)",
      type: "HEADERS",
      streamId: 0,
      hex: bufferToHex(headersFrame),
      asciiPreview: bufferToAsciiPreview(headersFrame.slice(0, 64)),
      annotations: [
        { offset: 0, length: 1, label: "Frame type", detail: "HEADERS (0x01)" },
        {
          offset: 1,
          length: 1,
          label: "Length (varint)",
          detail: String(headersPayload.length),
        },
      ],
      explanation:
        "Request headers on a bidirectional QUIC stream, compressed with QPACK (not HPACK).",
    },
  ];

  if (parsed.body) {
    const data = Buffer.from(parsed.body, "utf8");
    const dataFrame = h3Frame(0x00, data);
    frames.push({
      name: "DATA (HTTP/3)",
      type: "DATA",
      hex: bufferToHex(dataFrame),
      asciiPreview: bufferToAsciiPreview(data.slice(0, 64)),
      annotations: [
        { offset: 0, length: 1, label: "Frame type", detail: "DATA (0x00)" },
      ],
      explanation: "Request body as HTTP/3 DATA frames on the same request stream.",
    });
  }

  void getHeader(parsed.headers, "Host");

  return {
    version: "3",
    frames,
    qpack,
    hpack: qpack,
    pseudoHeaders: pseudo,
    quicTimeline: buildQuicHandshakeTimeline({
      hostname: parsed.target.hostname,
      altSvc: null,
      transport: "educational",
    }),
    notes: [...QUIC_LESSON_NOTES],
  };
}
