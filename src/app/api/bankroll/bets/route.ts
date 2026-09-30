import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, handleError, readJson } from "@/lib/api";
import { createBet, getBankrollState } from "@/lib/services/bankroll";

export async function GET() {
  try {
    return NextResponse.json((await getBankrollState()).bets);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  const forbidden = assertSameOrigin(req);
  if (forbidden) return forbidden;
  try {
    return NextResponse.json(await createBet(await readJson(req)), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
