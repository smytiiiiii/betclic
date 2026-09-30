import { NextResponse } from "next/server";
import { handleError } from "@/lib/api";
import { getFilterOptions } from "@/lib/services/matches";

export async function GET() {
  try {
    return NextResponse.json(await getFilterOptions());
  } catch (err) {
    return handleError(err);
  }
}
