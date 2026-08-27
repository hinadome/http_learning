import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/validate/rules";
import type { ComposedRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ComposedRequest;
    const result = validateRequest(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        issues: [
          {
            severity: "error",
            code: "bad_payload",
            message: e instanceof Error ? e.message : "Invalid payload",
          },
        ],
      },
      { status: 400 }
    );
  }
}
