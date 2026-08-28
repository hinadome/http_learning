import { NextResponse } from "next/server";
import { relayWebSocket } from "@/lib/clients/ws-relay";
import { enforceOutboundRateLimit } from "@/lib/api-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const limited = enforceOutboundRateLimit(request, "ws");
  if (limited) return limited;

  try {
    const body = await request.json();
    const result = await relayWebSocket(body);
    return NextResponse.json({
      ok: !result.error,
      ...result,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "WebSocket relay failed" },
      { status: 500 }
    );
  }
}
