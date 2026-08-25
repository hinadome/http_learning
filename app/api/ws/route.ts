import { NextResponse } from "next/server";
import { relayWebSocket } from "@/lib/clients/ws-relay";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
