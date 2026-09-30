import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleError } from "@/lib/api";
import { getOpportunities } from "@/lib/services/opportunities";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(7).optional(),
  minEdge: z.coerce.number().min(0).max(50).optional(),
  minConfidence: z.coerce.number().min(0).max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    return NextResponse.json(await getOpportunities(query));
  } catch (err) {
    return handleError(err);
  }
}
