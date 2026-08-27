export type HttpVersion = "1.0" | "1.1" | "2" | "3";

/** Optional encode-only lab mode (Wire tab). */
export type EncodeLab = "chunked" | "h2-trailers" | "h2-push" | "cl-te-smuggle";

/** In-app teaching labs (no outbound network; correct protocol semantics). */
export type TeachLab = "if-modified-since" | "jwt";

export interface TlsInfo {
  protocol?: string;
  alpnProtocol?: string;
  cipher?: { name: string; version: string };
  authorized?: boolean;
  subject?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
}

export type RequestProtocol =
  | "http"
  | "graphql"
  | "websocket"
  | "sse"
  | "grpc"
  | "mqtt";

export type BodyType = "none" | "text" | "json" | "graphql" | "multipart";

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

export interface MultipartField {
  id: string;
  name: string;
  value: string;
  enabled: boolean;
}

export interface RequestAssertion {
  id: string;
  kind: "status" | "header" | "body_contains";
  target?: string;
  expected: string;
}

export interface AssertionResult {
  id: string;
  passed: boolean;
  message: string;
}

export interface MockRule {
  id: string;
  name: string;
  method?: string;
  pathPattern: string;
  status: number;
  responseHeaders: string;
  responseBody: string;
  /** Pause on match; client edits response before display (mock only). */
  breakpoint?: boolean;
}

export interface RewriteRule {
  id: string;
  name: string;
  enabled: boolean;
  method?: string;
  pathPattern: string;
  /** Extra request header lines injected before send. */
  injectRequestHeaders?: string;
  /** Replace substring in response body (live send). */
  responseFind?: string;
  responseReplace?: string;
  /** Override response status when set. */
  setResponseStatus?: number;
}

export interface TrafficEntry {
  id: string;
  at: number;
  method: string;
  url: string;
  status?: number;
  durationMs: number;
  mocked: boolean;
  rewritten: boolean;
  requestHeaders: string;
  responsePreview?: string;
}

export interface BreakpointPending {
  ruleId: string;
  ruleName: string;
  status: number;
  responseHeaders: string;
  responseBody: string;
}

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvVariable[];
}

export interface CollectionFolder {
  id: string;
  name: string;
}

export interface CollectionEntry {
  id: string;
  name: string;
  folderId?: string;
  request: ComposedRequest;
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
  /** Follow 3xx Location hops (HTTP/1.x send only). Default false for teaching. */
  followRedirects?: boolean;
  maxRedirects?: number;
  /** Educational cookie jar: store Set-Cookie and send Cookie on later requests / redirect hops. */
  useCookieJar?: boolean;
  /** Application / teaching mode (default http). Value `sse` is HTTP with SSE Accept — labeled “HTTP / SSE” in the UI. */
  protocol?: RequestProtocol;
  bodyType?: BodyType;
  /** GraphQL variables JSON object string. */
  graphqlVariables?: string;
  multipartFields?: MultipartField[];
  /** Outbound WebSocket text frame. */
  wsOutboundMessage?: string;
  /** Post-response checks (no JS sandbox). */
  assertions?: RequestAssertion[];
  /** Route Send through mock matcher instead of network. */
  useMock?: boolean;
  mockRuleId?: string;
  /** MQTT topic when protocol is mqtt. */
  mqttTopic?: string;
  /** Client-edited response when resuming a mock breakpoint. */
  breakpointResume?: {
    status: number;
    responseHeaders: string;
    responseBody: string;
  };
  /** Wire-tab lab: chunked body, H2 trailers, or H2 push frames. */
  encodeLab?: EncodeLab;
  /** Local teaching lab (correct semantics; no outbound HTTP). */
  teachLab?: TeachLab;
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

export interface RedirectHop {
  hop: number;
  url: string;
  status: number;
  statusText: string;
  location: string;
  /** Set-Cookie from this hop (before following Location). */
  setCookie?: string | string[];
  /** Cookie header value sent on the *next* hop after this one (jar). */
  cookieSentNext?: string;
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
  /** 3xx hops when followRedirects is enabled (HTTP/1.x). */
  redirectChain?: RedirectHop[];
  finalUrl?: string;
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
  assertionResults?: AssertionResult[];
  protocolNotes?: string[];
  breakpointPending?: BreakpointPending;
  rewritten?: boolean;
  tlsInfo?: TlsInfo;
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
