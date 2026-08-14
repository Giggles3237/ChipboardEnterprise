import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { sales } from "../../../../../packages/database/src/schema";
import type { TenantContext } from "./context";

type SaleRow = typeof sales.$inferSelect;
type SaleInsert = typeof sales.$inferInsert;

type SaleInput = {
  clientName: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  color?: string;
  advisor?: string;
  delivered?: boolean;
  deliveryDate?: string;
  type?: string;
  storeId?: string;
  salespersonUserId?: string;
  sourceSystem?: string;
  sourceId?: string;
};

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle> | undefined;

function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is required to use sales.");
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

function scopedWhere(context: TenantContext, saleId?: string) {
  const conditions = [eq(sales.organizationId, context.organizationId)];

  if (saleId) {
    conditions.push(eq(sales.id, saleId));
  }

  if (context.storeIds?.length === 1 && context.storeIds[0]) {
    conditions.push(eq(sales.storeId, context.storeIds[0]));
  } else if (context.storeIds && context.storeIds.length > 1) {
    conditions.push(inArray(sales.storeId, context.storeIds));
  }

  return and(...conditions);
}

function resolveStoreId(context: TenantContext, input: { storeId?: string }) {
  const storeId = input.storeId ?? (context.storeIds?.length === 1 ? context.storeIds[0] : undefined);

  if (storeId && context.storeIds?.length && !context.storeIds.includes(storeId)) {
    throw new Error("Sale store is outside the current store scope.");
  }

  return storeId;
}

function toDate(value?: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (!value) return null;
  return new Date(value);
}

function mapSale(row: SaleRow) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    storeId: row.storeId ?? undefined,
    salespersonUserId: row.salespersonUserId ?? undefined,
    clientName: row.clientName,
    stockNumber: row.stockNumber,
    year: row.year ?? undefined,
    make: row.make ?? undefined,
    model: row.model ?? undefined,
    color: row.color ?? undefined,
    advisor: row.advisor ?? undefined,
    deliveryStatus: row.deliveryStatus,
    deliveryDate: row.deliveryDate?.toISOString(),
    saleType: row.saleType ?? undefined,
    sourceSystem: row.sourceSystem,
    sourceId: row.sourceId ?? undefined,
    createdByUserId: row.createdByUserId ?? undefined,
    createdAt: row.createdAt?.toISOString(),
    updatedAt: row.updatedAt?.toISOString(),
  };
}

function assertRequired(input: SaleInput) {
  const missing = ["clientName", "stockNumber", "year", "make", "model"].filter((field) => {
    const value = input[field as keyof SaleInput];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    throw new Error(`Missing required sale fields: ${missing.join(", ")}`);
  }
}

function createInsert(context: TenantContext, input: SaleInput): SaleInsert {
  assertRequired(input);

  return {
    organizationId: context.organizationId,
    storeId: resolveStoreId(context, input),
    salespersonUserId: input.salespersonUserId,
    clientName: input.clientName,
    stockNumber: input.stockNumber,
    year: input.year,
    make: input.make,
    model: input.model,
    color: input.color,
    advisor: input.advisor,
    deliveryStatus: input.delivered ? "delivered" : "pending",
    deliveryDate: toDate(input.deliveryDate) ?? null,
    saleType: input.type,
    sourceSystem: input.sourceSystem ?? "manual",
    sourceId: input.sourceId,
    createdByUserId: context.actorUserId,
  };
}

function createUpdate(context: TenantContext, input: Partial<SaleInput>): Partial<SaleInsert> {
  const update: Partial<SaleInsert> = {
    updatedAt: new Date(),
  };

  if (input.storeId !== undefined) update.storeId = resolveStoreId(context, input) ?? null;
  if (input.salespersonUserId !== undefined) update.salespersonUserId = input.salespersonUserId;
  if (input.clientName !== undefined) update.clientName = input.clientName;
  if (input.stockNumber !== undefined) update.stockNumber = input.stockNumber;
  if (input.year !== undefined) update.year = input.year;
  if (input.make !== undefined) update.make = input.make;
  if (input.model !== undefined) update.model = input.model;
  if (input.color !== undefined) update.color = input.color;
  if (input.advisor !== undefined) update.advisor = input.advisor;
  if (input.delivered !== undefined) update.deliveryStatus = input.delivered ? "delivered" : "pending";
  if (input.deliveryDate !== undefined) update.deliveryDate = toDate(input.deliveryDate) ?? null;
  if (input.type !== undefined) update.saleType = input.type;
  if (input.sourceSystem !== undefined) update.sourceSystem = input.sourceSystem;
  if (input.sourceId !== undefined) update.sourceId = input.sourceId;

  return update;
}

export async function listSales(context: TenantContext, pendingOnly = false) {
  const where = pendingOnly
    ? and(scopedWhere(context), eq(sales.deliveryStatus, "pending"))
    : scopedWhere(context);
  const rows = await getDb().select().from(sales).where(where).orderBy(desc(sales.deliveryDate), desc(sales.createdAt));

  return rows.map(mapSale);
}

export async function createSale(context: TenantContext, input: SaleInput) {
  const [row] = await getDb().insert(sales).values(createInsert(context, input)).returning();

  if (!row) throw new Error("Sale was not created.");
  return mapSale(row);
}

export async function updateSale(context: TenantContext, saleId: string, input: Partial<SaleInput>) {
  const [row] = await getDb().update(sales).set(createUpdate(context, input)).where(scopedWhere(context, saleId)).returning();

  if (!row) throw new Error("Sale not found.");
  return mapSale(row);
}

export async function deleteSale(context: TenantContext, saleId: string) {
  const [row] = await getDb().delete(sales).where(scopedWhere(context, saleId)).returning();

  if (!row) throw new Error("Sale not found.");
  return mapSale(row);
}
