import { NextResponse } from "next/server";
import { publishMqtt } from "@/lib/clients/mqtt-bridge";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await publishMqtt(body);
    return NextResponse.json({
      ok: result.published || !result.error,
      broker: body.broker,
      topic: body.topic,
      message: body.message,
      ...result,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "MQTT bridge failed" },
      { status: 500 }
    );
  }
}
