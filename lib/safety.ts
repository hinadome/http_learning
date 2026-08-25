import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  const ranges: Array<[number, number]> = [
    [ipv4ToInt("0.0.0.0"), ipv4ToInt("0.255.255.255")],
    [ipv4ToInt("10.0.0.0"), ipv4ToInt("10.255.255.255")],
    [ipv4ToInt("127.0.0.0"), ipv4ToInt("127.255.255.255")],
    [ipv4ToInt("169.254.0.0"), ipv4ToInt("169.254.255.255")],
    [ipv4ToInt("172.16.0.0"), ipv4ToInt("172.31.255.255")],
    [ipv4ToInt("192.168.0.0"), ipv4ToInt("192.168.255.255")],
  ];
  return ranges.some(([a, b]) => n >= a && n <= b);
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80")
  );
}

export function isPrivateIp(ip: string): boolean {
  if (net.isIP(ip) === 4) return isPrivateIPv4(ip);
  if (net.isIP(ip) === 6) return isPrivateIPv6(ip);
  return false;
}

export async function assertSafeTarget(
  url: URL,
  allowPrivateTargets = false
): Promise<void> {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http: and https: URLs are allowed.");
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) {
    if (!allowPrivateTargets) {
      throw new Error(
        `Blocked host "${host}". Enable “Allow private targets” to override (learning only).`
      );
    }
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host) && !allowPrivateTargets) {
      throw new Error(
        `Blocked private/link-local IP ${host}. Enable “Allow private targets” to override.`
      );
    }
    return;
  }

  let addresses: string[] = [];
  try {
    const result = await dns.lookup(host, { all: true });
    addresses = result.map((r) => r.address);
  } catch {
    throw new Error(`DNS lookup failed for host "${host}".`);
  }

  const privateHit = addresses.find((a) => isPrivateIp(a));
  if (privateHit && !allowPrivateTargets) {
    throw new Error(
      `Host "${host}" resolves to private/link-local address ${privateHit}. Enable “Allow private targets” to override.`
    );
  }
}

export const REQUEST_TIMEOUT_MS = 15_000;
export const MAX_RESPONSE_BYTES = 512 * 1024;
