import { NextResponse } from "next/server";
import { executeRequest } from "@/lib/clients";
import type { ComposedRequest, MockRule, RewriteRule } from "@/lib/types";

export const runtime = "nodejs";
/** Outbound Send / redirect hops — allow longer than default serverless limit when plan supports it. */
export const maxDuration = 60;

interface SendBody extends ComposedRequest {
  mockRules?: MockRule[];
  rewriteRules?: RewriteRule[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendBody;
    const { mockRules, rewriteRules, ...req } = body;
    const log = await executeRequest(req, { mockRules, rewriteRules });
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
