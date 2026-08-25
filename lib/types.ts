export type HttpVersion = "1.0" | "1.1" | "2" | "3";

export type Severity = "error" | "warning" | "info";

export interface DocRef {
  label: string;
  url: string;
  source?: string;
}

export interface ValidationIssue {
  severity: Severity;
  code: string;
  message: string;
  field?: string;
  /** Official docs to verify this rule (RFC / MDN). */
  docs?: DocRef[];
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export interface ParsedHeader {
  name: string;
  value: string;
  raw: string;
  line: number;
}

export interface ComposedRequest {
  version: HttpVersion;
  method: string;
  url: string;
  /** Raw header lines as typed by the user (Name: value) */
  headerText: string;
  body: string;
  allowPrivateTargets?: boolean;
  sendAnyway?: boolean;
}

export interface ParsedRequest {
  version: HttpVersion;
  method: string;
  url: string;
  target: URL;
  pathWithQuery: string;
  headers: ParsedHeader[];
  headerMap: Record<string, string>;
  body: string;
}

export interface LifecycleStep {
  id: string;
  label: string;
  status: "pending" | "ok" | "skip" | "error";
  detail?: string;
  durationMs?: number;
}

export interface FrameAnnotation {
  offset: number;
  length: number;
  label: string;
  detail?: string;
}

export interface EncodedFrame {
  name: string;
  type: string;
  streamId?: number;
  flags?: string[];
  hex: string;
  asciiPreview?: string;
  annotations: FrameAnnotation[];
  explanation: string;
}

export interface HpackEntry {
  name: string;
  value: string;
  encoding: "indexed" | "literal" | "pseudo";
  staticIndex?: number;
  plainBytes: number;
  encodedHex: string;
  note: string;
}

export interface EncodeResult {
  version: HttpVersion;
  textWire?: string;
  textWireHex?: string;
  prefaceHex?: string;
  frames: EncodedFrame[];
  hpack?: HpackEntry[];
  qpack?: HpackEntry[];
  pseudoHeaders?: Record<string, string>;
  notes: string[];
  /** Educational QUIC/TLS steps when version is 3. */
  quicTimeline?: LifecycleStep[];
}

export interface SendResponse {
  status: number;
  statusText: string;
  headers: Record<string, string | string[]>;
  body: string;
  bodyTruncated: boolean;
  sizeBytes: number;
  httpVersionNegotiated?: string;
  streamId?: number;
}

export interface LearningLog {
  steps: LifecycleStep[];
  validation: ValidationResult;
  encode: EncodeResult;
  response?: SendResponse;
  /** What was actually sent on the last Send (wire + curl). */
  sent?: {
    wireText?: string;
    wireHex?: string;
    curlCommand: string;
    headersSent: Record<string, string>;
    hostPresent?: boolean;
    notes: string[];
    protocol?: string;
    transport?: string;
    altSvc?: string | null;
    streamId?: number;
    pseudoHeaders?: Record<string, string>;
    quicNotes?: string[];
  };
  error?: string;
  timing: {
    totalMs: number;
    dnsMs?: number;
    connectMs?: number;
    tlsMs?: number;
    ttfbMs?: number;
  };
}

export interface HistoryItem {
  id: string;
  savedAt: number;
  request: ComposedRequest;
  summary: string;
}

export type ComparePair = "1.1-2" | "1.1-3" | "2-3";

export interface CompareEncodeResult {
  pair: ComparePair;
  left: EncodeResult;
  right: EncodeResult;
  leftTitle: string;
  rightTitle: string;
}
