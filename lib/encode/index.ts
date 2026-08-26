import type {
  ComposedRequest,
  CompareEncodeResult,
  ComparePair,
  EncodeResult,
} from "../types";
import { encodeHttp1, encodeHttp1Chunked, encodeHttp1ClTeSmuggle } from "./http1";
import { encodeHttp2 } from "./http2-frames";
import { encodeHttp2WithPush, encodeHttp2WithTrailers } from "./http2-labs";
import { encodeHttp3 } from "./http3-frames";

export type { ComparePair };

export function encodeRequest(req: ComposedRequest): EncodeResult {
  if (req.encodeLab === "cl-te-smuggle") {
    return encodeHttp1ClTeSmuggle(req);
  }
  if (req.encodeLab === "chunked" && (req.version === "1.0" || req.version === "1.1")) {
    return encodeHttp1Chunked(req);
  }
  if (req.version === "2" && req.encodeLab === "h2-trailers") {
    return encodeHttp2WithTrailers(req);
  }
  if (req.version === "2" && req.encodeLab === "h2-push") {
    return encodeHttp2WithPush(req);
  }
  switch (req.version) {
    case "1.0":
    case "1.1":
      return encodeHttp1(req);
    case "2":
      return encodeHttp2(req);
    case "3":
      return encodeHttp3(req);
    default:
      return encodeHttp1({ ...req, version: "1.1" });
  }
}

export function encodeCompare(
  req: ComposedRequest,
  pair: ComparePair = "1.1-2"
): CompareEncodeResult {
  switch (pair) {
    case "1.1-3":
      return {
        pair,
        left: encodeHttp1({ ...req, version: "1.1" }),
        right: encodeHttp3({ ...req, version: "3" }),
        leftTitle: "HTTP/1.1 text wire",
        rightTitle: "HTTP/3 frames + QPACK",
      };
    case "2-3":
      return {
        pair,
        left: encodeHttp2({ ...req, version: "2" }),
        right: encodeHttp3({ ...req, version: "3" }),
        leftTitle: "HTTP/2 frames + HPACK",
        rightTitle: "HTTP/3 frames + QPACK",
      };
    case "1.1-2":
    default:
      return {
        pair: "1.1-2",
        left: encodeHttp1({ ...req, version: "1.1" }),
        right: encodeHttp2({ ...req, version: "2" }),
        leftTitle: "HTTP/1.1 text wire",
        rightTitle: "HTTP/2 frames + HPACK",
      };
  }
}
