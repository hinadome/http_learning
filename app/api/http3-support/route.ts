import { NextResponse } from "next/server";
import { probeHttp3Support } from "@/lib/clients/http3";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const support = await probeHttp3Support();
  return NextResponse.json(support);
}
