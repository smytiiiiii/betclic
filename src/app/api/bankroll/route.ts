import { NextResponse } from "next/server";
import { handleError } from "@/lib/api";
import { getBankrollState } from "@/lib/services/bankroll";

export async function GET() {
  try {
    return NextResponse.json(await getBankrollState());
  } catch (err) {
    return handleError(err);
  }
}
