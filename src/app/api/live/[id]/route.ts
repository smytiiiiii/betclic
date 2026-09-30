import { NextResponse, type NextRequest } from "next/server";
import { handleError, jsonError } from "@/lib/api";
import { getProvider } from "@/lib/providers";

/** Instantané temps réel d'un match (polling). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/live/[id]">) {
  try {
    const { id } = await ctx.params;
    const snapshot = await getProvider().getLiveSnapshot(id);
    if (!snapshot) return jsonError("Match introuvable", 404, "not_found");
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleError(err);
  }
}
