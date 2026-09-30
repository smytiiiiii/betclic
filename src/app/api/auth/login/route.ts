import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertSameOrigin, handleError, jsonError, limit, readJson } from "@/lib/api";
import { SESSION_COOKIE, SESSION_MAX_AGE, authEnabled, createSessionToken, verifyPassword } from "@/lib/security/session";

const schema = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  const forbidden = assertSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = limit(req, "login", 8, 5 * 60_000);
  if (limited) return limited;
  try {
    if (!authEnabled()) return NextResponse.json({ ok: true });
    const { password } = schema.parse(await readJson(req, 1_000));
    if (!(await verifyPassword(password))) return jsonError("Mot de passe incorrect", 401, "invalid_credentials");
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    return handleError(err);
  }
}
