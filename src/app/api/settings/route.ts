import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, handleError, readJson } from "@/lib/api";
import { getSettings, updateSettings } from "@/lib/services/settings";

export async function GET() {
  try {
    return NextResponse.json(await getSettings());
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest) {
  const forbidden = assertSameOrigin(req);
  if (forbidden) return forbidden;
  try {
    return NextResponse.json(await updateSettings(await readJson(req)));
  } catch (err) {
    return handleError(err);
  }
}
