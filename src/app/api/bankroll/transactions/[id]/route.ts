import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, handleError, jsonError } from "@/lib/api";
import { deleteTransaction } from "@/lib/services/bankroll";

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/bankroll/transactions/[id]">) {
  const forbidden = assertSameOrigin(req);
  if (forbidden) return forbidden;
  try {
    const { id } = await ctx.params;
    if (!(await deleteTransaction(id))) return jsonError("Mouvement introuvable", 404, "not_found");
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
