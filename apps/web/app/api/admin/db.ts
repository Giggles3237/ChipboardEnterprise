import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { organizations, stores, users } from "../../../../../packages/database/src/schema";

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is required to use admin setup.");
    }

    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=require") || connectionString.includes("sslmode=verify-full")
        ? { rejectUnauthorized: true }
        : undefined,
    });
    db = drizzle(pool);
  }

  return db;
}

export function jsonError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  const safeStatus = message.includes("required") ? 400 : message.includes("not found") ? 404 : status;

  return Response.json({ message }, { status: safeStatus });
}

export function requireOrganizationId(request: Request) {
  const url = new URL(request.url);
  const organizationId = request.headers.get("x-chipboard-organization-id") ?? url.searchParams.get("organizationId");

  if (!organizationId) {
    throw new Error("organizationId is required.");
  }

  return organizationId;
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export const adminTables = {
  organizations,
  stores,
  users,
};

export const adminOrder = {
  organizationsByName: asc(organizations.name),
  storesByName: asc(stores.name),
  usersByName: asc(users.displayName),
};

export const adminWhere = {
  storesForOrganization: (organizationId: string) => eq(stores.organizationId, organizationId),
  usersForOrganization: (organizationId: string) => eq(users.organizationId, organizationId),
};
