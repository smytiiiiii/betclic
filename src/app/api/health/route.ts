import { NextResponse } from "next/server";
import { publicConfig } from "@/lib/config/env";
import { getProvider } from "@/lib/providers";

/** État de santé et configuration non sensible de l'application. */
export async function GET() {
  const provider = getProvider();
  return NextResponse.json({
    status: "ok",
    time: new Date().toISOString(),
    provider: provider.info,
    config: publicConfig(),
  });
}
