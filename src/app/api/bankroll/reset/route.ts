import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, handleError, readJson } from "@/lib/api";
import { resetBankroll } from "@/lib/services/bankroll";

/** POST { confirm: "RESET" } — supprime tous les paris et mouvements. */
export async function POST(req: NextRequest) {
  const forbidden = assertSameOrigin(req);
  if (forbidden) return forbidden;
  try {
    const body = (await readJson(req, 200)) as { confirm?: string };
    if (body?.confirm !== "RESET") {
      return NextResponse.json({ error: { message: "Confirmation requise", code: "confirmation_required" } }, { status: 400 });
    }
    await resetBankroll();
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
