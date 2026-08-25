import type { ComposedRequest, EncodeResult } from "../types";
import { encodeHttp2 } from "./http2-frames";
import { bufferToHex, writeUInt24BE } from "./bytes";

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

/** Educational HTTP/2 encode with trailing HEADERS (trailers) after DATA. */
export function encodeHttp2WithTrailers(req: ComposedRequest): EncodeResult {
  const base = encodeHttp2(req);
  const trailerBlock = Buffer.from([0x0d, 0x0f]); // literal grpc-status: 0 (educational stub)
  const trailersFrame = http2Frame(0x01, 0x05, 1, trailerBlock); // END_STREAM | END_HEADERS

  return {
    ...base,
    frames: [
      ...base.frames,
      {
        name: "HEADERS (trailers)",
        type: "HEADERS",
        streamId: 1,
        flags: ["END_STREAM", "END_HEADERS"],
        hex: bufferToHex(trailersFrame),
        asciiPreview: "…trailers…",
        annotations: [
          { offset: 3, length: 1, label: "Type", detail: "HEADERS (trailers)" },
          {
            offset: 4,
            length: 1,
            label: "Flags",
            detail: "END_STREAM | END_HEADERS",
          },
        ],
        explanation:
          "After the DATA frame, a trailing HEADERS block carries response trailers (e.g. grpc-status). END_STREAM on this frame closes the stream.",
      },
    ],
    notes: [
      ...(base.notes ?? []),
      "Trailers lab: trailing HEADERS appear after body DATA on the same stream (RFC 9113 §8.1).",
    ],
  };
}

/** Educational HTTP/2 encode with PUSH_PROMISE before the request HEADERS. */
export function encodeHttp2WithPush(req: ComposedRequest): EncodeResult {
  const base = encodeHttp2(req);
  const promisedPath = "/style.css";
  const pushPayload = Buffer.from([0x84]); // indexed :path /
  const pushPromise = http2Frame(0x05, 0x04, 1, pushPayload); // END_HEADERS

  const pushFrame = {
    name: "PUSH_PROMISE",
    type: "PUSH_PROMISE",
    streamId: 1,
    flags: ["END_HEADERS"],
    hex: bufferToHex(pushPromise),
    asciiPreview: "PUSH_PROMISE",
    annotations: [
      { offset: 3, length: 1, label: "Type", detail: "PUSH_PROMISE (0x05)" },
      { offset: 4, length: 1, label: "Flags", detail: "END_HEADERS" },
    ],
    explanation: `Server push (deprecated in practice): server promises ${promisedPath} on a reserved stream before the client asks. Browsers largely disabled push; still useful for learning frame types.`,
  };

  const settingsIdx = base.frames.findIndex((f) => f.type === "SETTINGS");
  const insertAt = settingsIdx >= 0 ? settingsIdx + 1 : 1;
  const frames = [...base.frames];
  frames.splice(insertAt, 0, pushFrame);

  return {
    ...base,
    frames,
    notes: [
      ...(base.notes ?? []),
      "Server Push lab: PUSH_PROMISE (stream 1) reserves a pushed stream — rarely used on the modern web.",
    ],
  };
}
