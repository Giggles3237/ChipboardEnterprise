import { eq } from "drizzle-orm";

import { users } from "../../../../../../packages/database/src/schema";
import { verifyPassword } from "../../../../lib/password";
import { createSessionToken, sessionCookieHeader } from "../../../../lib/session";
import { getDb, jsonError } from "../../admin/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");

    if (!email) throw new Error("email is required.");
    if (!password) throw new Error("password is required.");

    const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || user.status !== "active" || !verifyPassword(password, user.passwordHash)) {
      return Response.json({ message: "Invalid email or password." }, { status: 401 });
    }

    const token = createSessionToken({
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      displayName: user.displayName,
    });

    return Response.json(
      {
        user: {
          id: user.id,
          organizationId: user.organizationId,
          email: user.email,
          displayName: user.displayName,
        },
      },
      {
        headers: {
          "Set-Cookie": sessionCookieHeader(token),
        },
      }
    );
  } catch (error) {
    return jsonError(error);
  }
}

