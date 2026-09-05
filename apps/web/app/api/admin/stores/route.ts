import { and, eq } from "drizzle-orm";

import { adminOrder, adminTables, adminWhere, getDb, jsonError, requireOrganizationId } from "../db";

export const runtime = "nodejs";

function storeSettings(input: Record<string, unknown>) {
  return {
    getReadyToEmails: String(input.getReadyToEmails ?? "").trim() || null,
    getReadyCcEmails: String(input.getReadyCcEmails ?? "").trim() || null,
  };
}

export async function GET(request: Request) {
  try {
    const organizationId = requireOrganizationId(request);
    const rows = await getDb()
      .select()
      .from(adminTables.stores)
      .where(adminWhere.storesForOrganization(organizationId))
      .orderBy(adminOrder.storesByName);

    return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const organizationId = requireOrganizationId(request);
    const input = await request.json();
    const name = String(input.name ?? "").trim();
    const code = String(input.code ?? "").trim().toUpperCase();

    if (!name) throw new Error("store name is required.");
    if (!code) throw new Error("store code is required.");

    const [row] = await getDb()
      .insert(adminTables.stores)
      .values({
        organizationId,
        name,
        code,
        timezone: input.timezone || "America/New_York",
        status: input.status || "active",
        ...storeSettings(input),
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
    const name = String(input.name ?? "").trim();
    const code = String(input.code ?? "").trim().toUpperCase();

    if (!id) throw new Error("store id is required.");
    if (!name) throw new Error("store name is required.");
    if (!code) throw new Error("store code is required.");

    const [row] = await getDb()
      .update(adminTables.stores)
      .set({
        name,
        code,
        timezone: input.timezone || "America/New_York",
        status: input.status || "active",
        ...storeSettings(input),
        updatedAt: new Date(),
      })
      .where(and(eq(adminTables.stores.id, id), eq(adminTables.stores.organizationId, organizationId)))
      .returning();

    if (!row) throw new Error("store not found.");

    return Response.json(row);
  } catch (error) {
    return jsonError(error);
  }
}