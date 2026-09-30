import { NextResponse, type NextRequest } from "next/server";
import { handleError, jsonError } from "@/lib/api";
import { getProvider } from "@/lib/providers";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/matches/[id]">) {
  try {
    const { id } = await ctx.params;
    const match = await getProvider().getMatch(id);
    if (!match) return jsonError("Match introuvable", 404, "not_found");
    return NextResponse.json(match);
  } catch (err) {
    return handleError(err);
  }
}
