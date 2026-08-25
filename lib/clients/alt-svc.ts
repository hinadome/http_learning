import https from "node:https";
import { REQUEST_TIMEOUT_MS } from "../safety";

export interface AltSvcProbeResult {
  statusCode: number;
  altSvc: string | null;
  negotiatedVia: string;
  allAltSvc: string[];
}

/**
 * Probe Alt-Svc over HTTPS (HTTP/1.1 or h2 via Node https) without requiring H3 yet.
 */
export function probeAltSvc(
  hostname: string,
  port = 443,
  path = "/"
): Promise<AltSvcProbeResult> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        port,
        path,
        method: "HEAD",
        timeout: Math.min(REQUEST_TIMEOUT_MS, 8000),
        headers: {
          Host: hostname,
          "User-Agent": "HTTP-Learning-Checker/1.0",
          Connection: "close",
        },
      },
      (res) => {
        const raw = res.headers["alt-svc"];
        const list = raw
          ? (Array.isArray(raw) ? raw : [raw]).flatMap((v) =>
              String(v)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          : [];
        const h3 = list.find((v) => /^h3(=|\s|$)/i.test(v) || /h3="/i.test(v)) ?? null;
        res.resume();
        resolve({
          statusCode: res.statusCode ?? 0,
          altSvc: h3 ?? (list[0] ?? null),
          negotiatedVia: `HTTP/${res.httpVersion}`,
          allAltSvc: list,
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("Alt-Svc probe timed out"));
    });
    req.on("error", reject);
    req.end();
  });
}

export function altSvcAdvertisesH3(altSvc: string | null | undefined): boolean {
  if (!altSvc) return false;
  return /\bh3\b/i.test(altSvc);
}
