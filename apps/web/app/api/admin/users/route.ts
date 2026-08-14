import { hashPassword } from "../../../../lib/password";
import { adminOrder, adminTables, adminWhere, getDb, jsonError, requireOrganizationId } from "../db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const organizationId = requireOrganizationId(request);
    const rows = await getDb()
      .select()
      .from(adminTables.users)
      .where(adminWhere.usersForOrganization(organizationId))
      .orderBy(adminOrder.usersByName);

    return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const organizationId = requireOrganizationId(request);
    const input = await request.json();
    const email = String(input.email ?? "").trim().toLowerCase();
    const displayName = String(input.displayName ?? "").trim();
    const password = String(input.password ?? "");

    if (!email) throw new Error("user email is required.");
    if (!displayName) throw new Error("display name is required.");
    if (!password) throw new Error("password is required.");

    const [row] = await getDb()
      .insert(adminTables.users)
      .values({
        organizationId,
        email,
        displayName,
        passwordHash: hashPassword(password),
        status: input.status || "active",
      })
      .returning();

    return Response.json(row, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
