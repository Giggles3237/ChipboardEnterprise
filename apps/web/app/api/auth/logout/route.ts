import { clearSessionCookieHeader } from "../../../../lib/session";

export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    { message: "Signed out." },
    {
      headers: {
        "Set-Cookie": clearSessionCookieHeader(),
      },
    }
  );
}
