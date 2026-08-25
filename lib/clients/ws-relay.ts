import WebSocket from "ws";
import { assertSafeTarget } from "../safety";

export async function relayWebSocket(options: {
  url: string;
  message?: string;
  timeoutMs?: number;
  allowPrivateTargets?: boolean;
}): Promise<{
  messages: string[];
  notes: string[];
  error?: string;
  frameCount: number;
}> {
  const url = options.url.trim();
  const target = new URL(url);
  if (!/^wss?:$/i.test(target.protocol)) {
    throw new Error("URL must use ws: or wss: scheme");
  }
  await assertSafeTarget(target, options.allowPrivateTargets);

  const timeoutMs = Math.min(options.timeoutMs ?? 5000, 15000);
  const messages: string[] = [];
  const notes = [
    "WebSocket relay: server opened a client connection, sent optional message, collected inbound text frames.",
  ];

  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve({
        messages,
        notes,
        frameCount: messages.length,
      });
    }, timeoutMs);

    ws.on("open", () => {
      notes.push("Connection opened.");
      if (options.message) {
        ws.send(options.message);
        notes.push(`Sent text frame: ${options.message.slice(0, 200)}`);
      }
    });

    ws.on("message", (data) => {
      messages.push(typeof data === "string" ? data : data.toString("utf8"));
    });

    ws.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        messages,
        notes,
        error: err.message,
        frameCount: messages.length,
      });
    });

    ws.on("close", () => {
      clearTimeout(timer);
      resolve({
        messages,
        notes,
        frameCount: messages.length,
      });
    });
  });
}
