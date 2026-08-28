import type { ComparePair } from "@/lib/types";

export function multiplexSimForCompare(pair: ComparePair): {
  initialMode: "h1" | "h2" | "h3";
  initialPacketLoss: boolean;
  hint: string;
} {
  switch (pair) {
    case "1.1-2":
      return {
        initialMode: "h1",
        initialPacketLoss: false,
        hint: "You compared HTTP/1.1 text wire vs HTTP/2 frames — simulate how H1 opens multiple connections vs H2 multiplexing.",
      };
    case "1.1-3":
      return {
        initialMode: "h1",
        initialPacketLoss: false,
        hint: "You compared HTTP/1.1 vs HTTP/3 — simulate H1 connection limits vs QUIC multiplexing.",
      };
    case "2-3":
      return {
        initialMode: "h2",
        initialPacketLoss: true,
        hint: "You compared HPACK vs QPACK — run Simulate with packet loss to see H2 stall-all vs H3 stream-local.",
      };
  }
}
