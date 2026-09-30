import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, handleError, jsonError, readJson } from "@/lib/api";
import { deleteBet, updateBet } from "@/lib/services/bankroll";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/bankroll/bets/[id]">) {
  const forbidden = assertSameOrigin(req);
  if (forbidden) return forbidden;
  try {
    const { id } = await ctx.params;
    const bet = await updateBet(id, await readJson(req));
    if (!bet) return jsonError("Pari introuvable", 404, "not_found");
    return NextResponse.json(bet);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/bankroll/bets/[id]">) {
  const forbidden = assertSameOrigin(req);
  if (forbidden) return forbidden;
  try {
    const { id } = await ctx.params;
    if (!(await deleteBet(id))) return jsonError("Pari introuvable", 404, "not_found");
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
