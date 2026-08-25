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
  encodeHpackHeader,
  encodeHpackLiteral,
  findStaticIndex,
  writeUInt24BE,
} from "./bytes";

const CONNECTION_SPECIFIC = new Set([
  "connection",
  "transfer-encoding",
  "upgrade",
  "keep-alive",
  "proxy-connection",
  "host",
]);

function buildPseudo(req: ComposedRequest): Record<string, string> {
  const parsed = parseComposedRequest(req);
  const hostHeader = getHeader(parsed.headers, "Host");
  const authority =
    hostHeader?.value?.trim() ||
    (parsed.target.port &&
    !(
      (parsed.target.protocol === "https:" && parsed.target.port === "443") ||
      (parsed.target.protocol === "http:" && parsed.target.port === "80")
    )
      ? `${parsed.target.hostname}:${parsed.target.port}`
      : parsed.target.hostname);

  return {
    ":method": parsed.method,
    ":scheme": parsed.target.protocol.replace(":", ""),
    ":path": parsed.pathWithQuery || "/",
    ":authority": authority,
  };
}

function http2Frame(
  type: number,
  flags: number,
  streamId: number,
  payload: Buffer
): Buffer {
  const header = Buffer.alloc(9);
  writeUInt24BE(payload.length).copy(header, 0);
  header[3] = type;
  header[4] = flags;
  header.writeUInt32BE(streamId & 0x7fffffff, 5);
  return Buffer.concat([header, payload]);
}

function annotateFrame(
  name: string,
  typeName: string,
  frame: Buffer,
  streamId: number,
  flags: string[],
  explanation: string
): EncodedFrame {
  return {
    name,
    type: typeName,
    streamId,
    flags,
    hex: bufferToHex(frame),
    asciiPreview: bufferToAsciiPreview(frame.slice(0, 64)),
    annotations: [
      { offset: 0, length: 3, label: "Length", detail: String(frame.length - 9) },
      { offset: 3, length: 1, label: "Type", detail: typeName },
      { offset: 4, length: 1, label: "Flags", detail: flags.join("|") || "none" },
      { offset: 5, length: 4, label: "Stream ID", detail: String(streamId) },
      {
        offset: 9,
        length: Math.max(0, frame.length - 9),
        label: "Payload",
      },
    ],
    explanation,
  };
}

export function encodeHttp2(req: ComposedRequest): EncodeResult {
  const parsed = parseComposedRequest(req);
  const pseudo = buildPseudo(req);
  const hpack: HpackEntry[] = [];
  const headerBlocks: Buffer[] = [];

  const ordered: Array<[string, string]> = [
    [":method", pseudo[":method"]],
    [":scheme", pseudo[":scheme"]],
    [":path", pseudo[":path"]],
    [":authority", pseudo[":authority"]],
  ];

  for (const h of parsed.headers) {
    if (!h.name) continue;
    const lower = h.name.toLowerCase();
    if (CONNECTION_SPECIFIC.has(lower) || lower.startsWith(":")) continue;
    ordered.push([lower, h.value]);
  }

  for (const [name, value] of ordered) {
    const enc = encodeHpackHeader(name, value);
    // Prefer exact static for :method GET/POST and :scheme
    let bytes = enc.bytes;
    let encoding = enc.encoding;
    let staticIndex = enc.staticIndex;
    if (name === ":method" && value === "GET") {
      bytes = Buffer.from([0x82]);
      encoding = "indexed";
      staticIndex = 2;
    } else if (name === ":method" && value === "POST") {
      bytes = Buffer.from([0x83]);
      encoding = "indexed";
      staticIndex = 3;
    } else if (name === ":scheme" && value === "https") {
      bytes = Buffer.from([0x87]);
      encoding = "indexed";
      staticIndex = 7;
    } else if (name === ":scheme" && value === "http") {
      bytes = Buffer.from([0x86]);
      encoding = "indexed";
      staticIndex = 6;
    } else if (name === ":path" && value === "/") {
      bytes = Buffer.from([0x84]);
      encoding = "indexed";
      staticIndex = 4;
    } else if (!staticIndex) {
      bytes = encodeHpackLiteral(name, value);
      encoding = "literal";
    }

    headerBlocks.push(bytes);
    hpack.push({
      name,
      value,
      encoding: name.startsWith(":") ? "pseudo" : encoding,
      staticIndex: staticIndex ?? findStaticIndex(name, value),
      plainBytes: Buffer.byteLength(`${name}: ${value}`, "utf8"),
      encodedHex: bufferToHex(bytes),
      note:
        encoding === "indexed"
          ? `Indexed from HPACK static table (index ${staticIndex}).`
          : "Literal without indexing (educational encoder; production clients also use Huffman + dynamic table).",
    });
  }

  const headerPayload = Buffer.concat(headerBlocks);
  const endStream = !parsed.body;
  const headersFlags = endStream ? 0x05 : 0x04; // END_HEADERS | maybe END_STREAM
  const headersFrame = http2Frame(0x01, headersFlags, 1, headerPayload);

  const settingsPayload = Buffer.alloc(6);
  settingsPayload.writeUInt16BE(0x3, 0); // SETTINGS_MAX_CONCURRENT_STREAMS
  settingsPayload.writeUInt32BE(100, 2);
  const settingsFrame = http2Frame(0x04, 0x00, 0, settingsPayload);

  const preface = Buffer.from("PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n", "ascii");

  const frames: EncodedFrame[] = [
    {
      name: "Connection preface",
      type: "PREFACE",
      hex: bufferToHex(preface),
      asciiPreview: "PRI * HTTP/2.0..SM..",
      annotations: [
        {
          offset: 0,
          length: preface.length,
          label: "Client connection preface",
          detail: "Fixed 24-byte magic string",
        },
      ],
      explanation:
        "Every HTTP/2 client connection starts with this fixed preface, then SETTINGS.",
    },
    annotateFrame(
      "SETTINGS",
      "SETTINGS",
      settingsFrame,
      0,
      [],
      "Connection-level parameters. Stream ID 0 is the control stream."
    ),
    annotateFrame(
      "HEADERS",
      "HEADERS",
      headersFrame,
      1,
      endStream ? ["END_STREAM", "END_HEADERS"] : ["END_HEADERS"],
      "Request headers compressed with HPACK on stream 1. Pseudo-headers come first."
    ),
  ];

  if (parsed.body) {
    const data = Buffer.from(parsed.body, "utf8");
    const dataFrame = http2Frame(0x00, 0x01, 1, data); // END_STREAM
    frames.push(
      annotateFrame(
        "DATA",
        "DATA",
        dataFrame,
        1,
        ["END_STREAM"],
        "Request body carried in one or more DATA frames on the same stream."
      )
    );
  }

  return {
    version: "2",
    prefaceHex: bufferToHex(preface),
    frames,
    hpack,
    pseudoHeaders: pseudo,
    notes: [
      "TLS encrypts the real connection; this hex is the logical HTTP/2 framing of your request (educational).",
      "HPACK replaces repeated header text with static/dynamic table indexes.",
      "Connection-specific headers (Connection, Transfer-Encoding, Host, …) are omitted from the H2 header block.",
    ],
  };
}

export function getHttp2PseudoHeaders(req: ComposedRequest): Record<string, string> {
  return buildPseudo(req);
}
