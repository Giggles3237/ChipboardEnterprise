import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "chipboard_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  userId: string;
  organizationId: string;
  email: string;
  displayName: string;
  exp: number;
};

export type AppSession = Omit<SessionPayload, "exp"> & {
  expiresAt: string;
};

function getSecret() {
  const secret = process.env.APP_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("APP_SESSION_SECRET must be set to at least 32 characters.");
  }

  return secret;
}

function base64url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createSessionToken(input: Omit<SessionPayload, "exp">) {
  const payload: SessionPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = base64url(JSON.stringify(payload));

  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token?: string | null): AppSession | null {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expectedSignature = sign(encoded);
  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    userId: payload.userId,
    organizationId: payload.organizationId,
    email: payload.email,
    displayName: payload.displayName,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

export function sessionCookieHeader(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearSessionCookieHeader() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}
