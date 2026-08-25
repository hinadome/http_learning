export function bufferToHex(buf: Buffer | Uint8Array, group = 2): string {
  const hex = Buffer.from(buf)
    .toString("hex")
    .toUpperCase()
    .replace(/(..)/g, "$1 ")
    .trim();
  if (group <= 1) return hex;
  return hex;
}

export function bufferToAsciiPreview(buf: Buffer | Uint8Array): string {
  return Array.from(Buffer.from(buf))
    .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
    .join("");
}

export function writeUInt24BE(n: number): Buffer {
  const b = Buffer.alloc(3);
  b[0] = (n >>> 16) & 0xff;
  b[1] = (n >>> 8) & 0xff;
  b[2] = n & 0xff;
  return b;
}

/** Minimal HPACK integer encoding (RFC 7541 §5.1) */
export function encodeHpackInteger(value: number, prefixBits: number): number[] {
  const max = (1 << prefixBits) - 1;
  if (value < max) return [value];
  const bytes = [max];
  let v = value - max;
  while (v >= 128) {
    bytes.push((v & 0x7f) | 0x80);
    v >>= 7;
  }
  bytes.push(v);
  return bytes;
}

/** Literal header field without indexing — new name (RFC 7541 §6.2.2) */
export function encodeHpackLiteral(name: string, value: string): Buffer {
  const nameBytes = Buffer.from(name.toLowerCase(), "utf8");
  const valueBytes = Buffer.from(value, "utf8");
  const out: number[] = [0x00]; // literal, new name
  out.push(...encodeHpackInteger(nameBytes.length, 7));
  out.push(...nameBytes);
  out.push(...encodeHpackInteger(valueBytes.length, 7));
  out.push(...valueBytes);
  return Buffer.from(out);
}

/** Indexed header field if in static table, else literal */
export function encodeHpackHeader(
  name: string,
  value: string
): { bytes: Buffer; encoding: "indexed" | "literal"; staticIndex?: number } {
  const lower = name.toLowerCase();
  const idx = HPACK_STATIC.findIndex(
    ([n, v]) => n === lower && (v === undefined || v === value)
  );
  // Exact name+value match in static table
  const exact = HPACK_STATIC.findIndex(([n, v]) => n === lower && v === value);
  if (exact >= 0) {
    const index = exact + 1;
    return {
      bytes: Buffer.from(encodeHpackInteger(index, 7).map((b, i) =>
        i === 0 ? b | 0x80 : b
      )),
      encoding: "indexed",
      staticIndex: index,
    };
  }
  // Name-only index
  const nameOnly = HPACK_STATIC.findIndex(([n, v]) => n === lower && v === undefined);
  if (nameOnly < 0) {
    const named = HPACK_STATIC.findIndex(([n]) => n === lower);
    if (named >= 0 && HPACK_STATIC[named][1] === undefined) {
      // fallthrough
    }
  }
  void idx;
  // Use literal with new name for clarity in educational view
  return {
    bytes: encodeHpackLiteral(lower, value),
    encoding: "literal",
  };
}

/** Subset of HPACK static table (RFC 7541 Appendix A) — name, optional value */
export const HPACK_STATIC: Array<[string, string | undefined]> = [
  [":authority", undefined],
  [":method", "GET"],
  [":method", "POST"],
  [":path", "/"],
  [":path", "/index.html"],
  [":scheme", "http"],
  [":scheme", "https"],
  [":status", "200"],
  [":status", "204"],
  [":status", "206"],
  [":status", "304"],
  [":status", "400"],
  [":status", "404"],
  [":status", "500"],
  ["accept-charset", undefined],
  ["accept-encoding", "gzip, deflate"],
  ["accept-language", undefined],
  ["accept-ranges", undefined],
  ["accept", undefined],
  ["access-control-allow-origin", undefined],
  ["age", undefined],
  ["allow", undefined],
  ["authorization", undefined],
  ["cache-control", undefined],
  ["content-disposition", undefined],
  ["content-encoding", undefined],
  ["content-language", undefined],
  ["content-length", undefined],
  ["content-location", undefined],
  ["content-range", undefined],
  ["content-type", undefined],
  ["cookie", undefined],
  ["date", undefined],
  ["etag", undefined],
  ["expect", undefined],
  ["expires", undefined],
  ["from", undefined],
  ["host", undefined],
  ["if-match", undefined],
  ["if-modified-since", undefined],
  ["if-none-match", undefined],
  ["if-range", undefined],
  ["if-unmodified-since", undefined],
  ["last-modified", undefined],
  ["link", undefined],
  ["location", undefined],
  ["max-forwards", undefined],
  ["proxy-authenticate", undefined],
  ["proxy-authorization", undefined],
  ["range", undefined],
  ["referer", undefined],
  ["refresh", undefined],
  ["retry-after", undefined],
  ["server", undefined],
  ["set-cookie", undefined],
  ["strict-transport-security", undefined],
  ["transfer-encoding", undefined],
  ["user-agent", undefined],
  ["vary", undefined],
  ["via", undefined],
  ["www-authenticate", undefined],
];

export function findStaticIndex(
  name: string,
  value?: string
): number | undefined {
  const lower = name.toLowerCase();
  if (value !== undefined) {
    const exact = HPACK_STATIC.findIndex(([n, v]) => n === lower && v === value);
    if (exact >= 0) return exact + 1;
  }
  const nameOnly = HPACK_STATIC.findIndex(
    ([n, v]) => n === lower && v === undefined
  );
  if (nameOnly >= 0) return nameOnly + 1;
  return undefined;
}
