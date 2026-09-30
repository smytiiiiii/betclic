import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, handleError, limit, readJson } from "@/lib/api";
import { explainMarket, explainRequestSchema } from "@/lib/ai/explain";

/** POST { matchId, marketKey, question? } → explication structurée (données / calculs / interprétation). */
export async function POST(req: NextRequest) {
  const forbidden = assertSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = limit(req, "explain", 12, 60_000);
  if (limited) return limited;
  try {
    const input = explainRequestSchema.parse(await readJson(req, 4_000));
    return NextResponse.json(await explainMarket(input));
  } catch (err) {
    return handleError(err);
  }
}
