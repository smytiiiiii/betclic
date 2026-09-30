import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { ProviderError } from "@/lib/providers";
import { rateLimit } from "@/lib/security/rate-limit";

export interface ApiErrorBody {
  error: { message: string; code: string; details?: unknown };
}

export function jsonError(message: string, status: number, code = "error", details?: unknown) {
  return NextResponse.json<ApiErrorBody>({ error: { message, code, details } }, { status });
}

/** Transforme une exception en réponse JSON propre (sans fuite d'informations internes). */
export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError("Requête invalide", 400, "validation_error", err.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  if (err instanceof ProviderError) {
    return jsonError(err.message, err.status === 429 ? 429 : 502, "provider_error");
  }
  if (err && typeof err === "object" && "status" in err && typeof (err as { status: unknown }).status === "number") {
    const status = (err as { status: number }).status;
    if (status >= 400 && status < 500) return jsonError(err instanceof Error ? err.message : "Requête refusée", status, "request_error");
  }
  console.error("[api] erreur inattendue", err);
  return jsonError("Erreur interne du serveur", 500, "internal_error");
}

/**
 * Protection CSRF pour les requêtes mutantes : l'en-tête Origin (ou
 * Referer) doit correspondre à l'hôte de la requête.
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return jsonError("Origine de la requête manquante", 403, "forbidden_origin");
  try {
    if (new URL(origin).host !== host) return jsonError("Origine de la requête non autorisée", 403, "forbidden_origin");
  } catch {
    return jsonError("Origine de la requête invalide", 403, "forbidden_origin");
  }
  return null;
}

export function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function limit(req: NextRequest, name: string, max: number, windowMs: number): NextResponse | null {
  const r = rateLimit(`${name}:${clientKey(req)}`, max, windowMs);
  if (r.ok) return null;
  const res = jsonError("Trop de requêtes, réessayez dans un instant", 429, "rate_limited");
  res.headers.set("Retry-After", String(r.retryAfter));
  return res;
}

export async function readJson(req: NextRequest, maxBytes = 32_000): Promise<unknown> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw Object.assign(new Error("Corps de requête trop volumineux"), { status: 413 });
  const text = await req.text();
  if (text.length > maxBytes) throw Object.assign(new Error("Corps de requête trop volumineux"), { status: 413 });
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error("JSON invalide"), { status: 400 });
  }
}
