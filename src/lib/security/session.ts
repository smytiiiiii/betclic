/**
 * Session signée (HMAC-SHA256, Web Crypto) pour la protection optionnelle
 * par mot de passe (APP_ACCESS_PASSWORD). Compatible proxy et route handlers.
 */
export const SESSION_COOKIE = "kairos_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

/** Comparaison à temps constant. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function sessionSecret() {
  // Le secret de session dérive du mot de passe si APP_SESSION_SECRET est absent.
  return process.env.APP_SESSION_SECRET || `kairos:${process.env.APP_ACCESS_PASSWORD ?? ""}`;
}

export function authEnabled() {
  return Boolean(process.env.APP_ACCESS_PASSWORD);
}

export async function createSessionToken(now = Date.now()) {
  const expires = Math.floor(now / 1000) + SESSION_MAX_AGE;
  const payload = `v1.${expires}`;
  return `${payload}.${await hmac(sessionSecret(), payload)}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expires = Number(parts[1]);
  if (!Number.isFinite(expires) || expires * 1000 < now) return false;
  const expected = await hmac(sessionSecret(), `${parts[0]}.${parts[1]}`);
  return safeEqual(expected, parts[2]);
}

export async function verifyPassword(candidate: string) {
  const expected = process.env.APP_ACCESS_PASSWORD ?? "";
  if (!expected) return false;
  // Comparaison des empreintes pour éviter les fuites de longueur.
  const [a, b] = await Promise.all([hmac("pw", candidate), hmac("pw", expected)]);
  return safeEqual(a, b);
}
