import { NextResponse } from "next/server";
import { handleError } from "@/lib/api";
import { getBacktest } from "@/lib/services/backtest";

export async function GET() {
  try {
    return NextResponse.json(await getBacktest());
  } catch (err) {
    return handleError(err);
  }
}
