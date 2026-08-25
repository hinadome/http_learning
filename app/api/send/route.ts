import { NextResponse } from "next/server";
import { executeRequest } from "@/lib/clients";
import type { ComposedRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ComposedRequest;
    const log = await executeRequest(body);
    return NextResponse.json(log);
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Send failed",
        steps: [],
        validation: { ok: false, issues: [] },
        encode: { version: "1.1", frames: [], notes: [] },
        timing: { totalMs: 0 },
      },
      { status: 500 }
    );
  }
}
