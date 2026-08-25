import type { TlsInfo } from "../types";

function formatDn(dn: Record<string, string | string[] | undefined>): string {
  return Object.entries(dn)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(", ") : v}`)
    .join(", ");
}

/** Extract TLS details from a Node TLSSocket (HTTPS sends only). */
export function extractTlsInfo(socket: unknown): TlsInfo | undefined {
  if (!socket || typeof socket !== "object") return undefined;
  const tls = socket as {
    getProtocol?: () => string | null;
    alpnProtocol?: string | false | null;
    getCipher?: () => { name: string; version: string } | null;
    authorized?: boolean;
    getPeerCertificate?: (detailed?: boolean) => {
      subject?: Record<string, string | string[] | undefined>;
      issuer?: Record<string, string | string[] | undefined>;
      valid_from?: string;
      valid_to?: string;
    } | null;
  };
  if (typeof tls.getProtocol !== "function") return undefined;

  const cert = tls.getPeerCertificate?.(true);
  const cipher = tls.getCipher?.();

  return {
    protocol: tls.getProtocol() || undefined,
    alpnProtocol:
      typeof tls.alpnProtocol === "string" ? tls.alpnProtocol : undefined,
    cipher: cipher ? { name: cipher.name, version: cipher.version } : undefined,
    authorized: tls.authorized,
    subject: cert?.subject ? formatDn(cert.subject) : undefined,
    issuer: cert?.issuer ? formatDn(cert.issuer) : undefined,
    validFrom: cert?.valid_from,
    validTo: cert?.valid_to,
  };
}
