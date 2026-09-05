import { eq } from "drizzle-orm";

import { adminOrder, adminTables, getDb, jsonError, slugify } from "../db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await getDb().select().from(adminTables.organizations).orderBy(adminOrder.organizationsByName);
    return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const name = String(input.name ?? "").trim();

    if (!name) {
      throw new Error("organization name is required.");
    }

    const [row] = await getDb()
      .insert(adminTables.organizations)
      .values({
        name,
        slug: input.slug ? slugify(String(input.slug)) : slugify(name),
        timezone: input.timezone || "America/New_York",
        status: input.status || "trial",
      })
      .returning();

    return Response.json(row, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const input = await request.json();
    const id = String(input.id ?? "").trim();
    const name = String(input.name ?? "").trim();

    if (!id) throw new Error("organization id is required.");
    if (!name) throw new Error("organization name is required.");

    const [row] = await getDb()
      .update(adminTables.organizations)
      .set({
        name,
        slug: input.slug ? slugify(String(input.slug)) : slugify(name),
        timezone: input.timezone || "America/New_York",
        status: input.status || "trial",
        updatedAt: new Date(),
      })
      .where(eq(adminTables.organizations.id, id))
      .returning();

    if (!row) throw new Error("organization not found.");

    return Response.json(row);
  } catch (error) {
    return jsonError(error);
  }
}
