import { and, eq } from "drizzle-orm";

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

export async function PUT(request: Request) {
  try {
    const organizationId = requireOrganizationId(request);
    const input = await request.json();
    const id = String(input.id ?? "").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    const displayName = String(input.displayName ?? "").trim();
    const password = String(input.password ?? "");

    if (!id) throw new Error("user id is required.");
    if (!email) throw new Error("user email is required.");
    if (!displayName) throw new Error("display name is required.");

    const values: {
      email: string;
      displayName: string;
      status: "invited" | "active" | "disabled";
      updatedAt: Date;
      passwordHash?: string;
    } = {
      email,
      displayName,
      status: input.status || "active",
      updatedAt: new Date(),
    };

    if (password) {
      values.passwordHash = hashPassword(password);
    }

    const [row] = await getDb()
      .update(adminTables.users)
      .set(values)
      .where(and(eq(adminTables.users.id, id), eq(adminTables.users.organizationId, organizationId)))
      .returning();

    if (!row) throw new Error("user not found.");

    return Response.json(row);
  } catch (error) {
    return jsonError(error);
  }
}
