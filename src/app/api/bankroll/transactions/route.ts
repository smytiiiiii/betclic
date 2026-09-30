import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, handleError, readJson } from "@/lib/api";
import { createTransaction } from "@/lib/services/bankroll";

export async function POST(req: NextRequest) {
  const forbidden = assertSameOrigin(req);
  if (forbidden) return forbidden;
  try {
    return NextResponse.json(await createTransaction(await readJson(req)), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
