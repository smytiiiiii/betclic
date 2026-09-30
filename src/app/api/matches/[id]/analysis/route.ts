import { NextResponse, type NextRequest } from "next/server";
import { handleError, jsonError } from "@/lib/api";
import { getMatchDetail } from "@/lib/services/analysis";

/** Analyse complète d'un match : forme, statistiques, probabilités, facteurs, value. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/matches/[id]/analysis">) {
  try {
    const { id } = await ctx.params;
    const detail = await getMatchDetail(id);
    if (!detail) return jsonError("Match introuvable", 404, "not_found");
    return NextResponse.json(detail);
  } catch (err) {
    return handleError(err);
  }
}
