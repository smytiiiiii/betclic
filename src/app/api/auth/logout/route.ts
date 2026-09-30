import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/security/session";

export async function POST(req: NextRequest) {
  const forbidden = assertSameOrigin(req);
  if (forbidden) return forbidden;
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
