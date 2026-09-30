import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, handleError, limit, readJson } from "@/lib/api";
import { evaluateAccumulator } from "@/lib/services/accumulator";

/** POST { selections: [{ matchId, marketKey, odds? }] } → probabilité combinée approximative. */
export async function POST(req: NextRequest) {
  const forbidden = assertSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = limit(req, "accumulator", 60, 60_000);
  if (limited) return limited;
  try {
    return NextResponse.json(await evaluateAccumulator(await readJson(req, 8_000)));
  } catch (err) {
    return handleError(err);
  }
}
