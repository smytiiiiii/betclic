import { NextResponse } from "next/server";
import { handleError } from "@/lib/api";
import { getProvider } from "@/lib/providers";

/** Matchs actuellement en direct (score + minute). */
export async function GET() {
  try {
    const now = Date.now();
    const matches = await getProvider().getMatches({
      from: new Date(now - 3 * 3_600_000).toISOString(),
      to: new Date(now).toISOString(),
      status: ["LIVE", "HALFTIME"],
    });
    return NextResponse.json({ matches, updatedAt: new Date(now).toISOString() });
  } catch (err) {
    return handleError(err);
  }
}
