import { NextResponse, type NextRequest } from "next/server";
import { handleError } from "@/lib/api";
import { listMatchCards, matchFiltersSchema } from "@/lib/services/matches";

/**
 * GET /api/matches?date=YYYY-MM-DD&competition=&country=&team=&q=&status=all|upcoming|live|finished&from=HH&to=HH
 */
export async function GET(req: NextRequest) {
  try {
    const filters = matchFiltersSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    return NextResponse.json(await listMatchCards(filters));
  } catch (err) {
    return handleError(err);
  }
}
