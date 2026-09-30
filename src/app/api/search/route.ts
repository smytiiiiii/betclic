import { NextResponse, type NextRequest } from "next/server";
import { handleError, limit } from "@/lib/api";
import { search } from "@/lib/services/matches";

export async function GET(req: NextRequest) {
  const limited = limit(req, "search", 60, 60_000);
  if (limited) return limited;
  try {
    const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
    return NextResponse.json({ results: await search(q) });
  } catch (err) {
    return handleError(err);
  }
}
