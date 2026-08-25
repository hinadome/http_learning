export interface CurriculumStep {
  title: string;
  description: string;
  presetId?: string;
}

export interface Curriculum {
  id: string;
  title: string;
  description: string;
  steps: CurriculumStep[];
}

export const CURRICULA: Curriculum[] = [
  {
    id: "http11-basics",
    title: "HTTP/1.1 basics",
    description: "Request shape, Host, and wire format.",
    steps: [
      {
        title: "Valid GET",
        description: "Load httpbin GET → Validate → Encode → Send.",
        presetId: "httpbin-get",
      },
      {
        title: "Missing Host lab",
        description: "See validation fail; try Send anyway.",
        presetId: "missing-host",
      },
      {
        title: "Chunked encoding",
        description: "Encode tab → inspect chunked wire framing.",
        presetId: "chunked-encoding",
      },
      {
        title: "Redirect chain",
        description: "Toggle Follow redirects and compare Response tab.",
        presetId: "redirect-302",
      },
    ],
  },
  {
    id: "h2-h3",
    title: "HTTP/2 & HTTP/3",
    description: "Multiplexing, HPACK/QPACK, and binary frames.",
    steps: [
      {
        title: "Multiplex simulator",
        description: "Run the animated H1 vs H2 vs H3 load demo.",
      },
      {
        title: "Compare 1.1 vs 2",
        description: "Load HTTP/2 GET → Compare 1.1 vs 2.",
        presetId: "http2-get",
      },
      {
        title: "H2 trailers encode",
        description: "Lab preset → Encode → trailing HEADERS frame.",
        presetId: "h2-trailers",
      },
      {
        title: "H2 server push encode",
        description: "Lab preset → Encode → PUSH_PROMISE frame.",
        presetId: "h2-push",
      },
      {
        title: "HTTP/3 + Alt-Svc",
        description: "Send to Cloudflare → QUIC timeline + TLS panel.",
        presetId: "http3-get",
      },
    ],
  },
  {
    id: "client-tools",
    title: "Client & intercept tools",
    description: "Collections, mocks, rewrites, and traffic log.",
    steps: [
      {
        title: "Environments",
        description: "Set {{baseUrl}} and substitute in URL.",
      },
      {
        title: "Mock + breakpoint",
        description: "Create mock rule with Breakpoint → edit response.",
      },
      {
        title: "Rewrite on Send",
        description: "Inject header or replace body substring.",
      },
      {
        title: "Session traffic + HAR",
        description: "Send twice → traffic log → Copy HAR.",
      },
    ],
  },
];
