import { NextResponse } from "next/server";
import { encodeCompare, encodeRequest } from "@/lib/encode";
import type { ComparePair, ComposedRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ComposedRequest & {
      compare?: boolean;
      comparePair?: ComparePair;
    };
    if (body.compare) {
      return NextResponse.json(
        encodeCompare(body, body.comparePair ?? "1.1-2")
      );
    }
    return NextResponse.json(encodeRequest(body));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Encode failed" },
      { status: 400 }
    );
  }
}
