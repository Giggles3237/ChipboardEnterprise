import { cookies } from "next/headers";

import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/session";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  return Response.json({ authenticated: Boolean(session), session });
}
