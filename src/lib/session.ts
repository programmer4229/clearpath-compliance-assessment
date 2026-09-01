// Stateless-session auth, following Next.js's own authentication guide
// (node_modules/next/dist/docs/01-app/02-guides/authentication.md): a
// SESSION_SECRET-signed JWT in an httpOnly cookie carries just the user id;
// every read of "who's logged in" re-verifies the cookie and re-fetches the
// user row from the DB (via the cached verifySession() below — the Data
// Access Layer pattern the guide recommends) rather than trusting stale
// claims baked into the token. That also means revoking access (e.g. if a
// user were deleted) takes effect on their very next request, not just
// after the token expires.
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";

export const SESSION_COOKIE = "clearpath_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function encodedKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Set it in Vercel (Project Settings > " +
        "Environment Variables) and in .env.local for local dev — generate " +
        "one with `openssl rand -base64 32`."
    );
  }
  return new TextEncoder().encode(secret);
}

async function encrypt(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_MS / 1000}s`)
    .sign(encodedKey());
}

async function decrypt(token: string | undefined): Promise<{ userId: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    // Expired, tampered, signed with a different/rotated secret, or just
    // garbage — all of these mean "not logged in," not a crash.
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const token = await encrypt(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  account_type: "employee" | "affiliate";
  affiliate_company: string | null;
  is_marketer: boolean;
  is_reviewer: boolean;
}

// Data Access Layer: the one place that turns "a cookie was present" into
// "here's the actual, currently-valid user." cache() dedupes this to a
// single DB round trip per request even when called from many places
// (layout, a page, a Server Action) during the same render/action.
export const verifySession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const session = await decrypt(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const user = await db
    .selectFrom("users")
    .select(["id", "name", "email", "account_type", "affiliate_company", "is_marketer", "is_reviewer"])
    .where("id", "=", session.userId)
    .executeTakeFirst();
  return user ?? null;
});
