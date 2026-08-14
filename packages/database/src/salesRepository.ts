import { and, desc, eq, inArray } from "drizzle-orm";
import type {
  CreateSaleInput,
  Sale,
  SaleMutationResult,
  SalesRepository,
  TenantContext,
  UpdateSaleInput,
} from "@chipboard/sales";

import type { createDatabase } from "./client.js";
import { sales } from "./schema.js";

type Database = ReturnType<typeof createDatabase>;
type SaleRow = typeof sales.$inferSelect;
type SaleInsert = typeof sales.$inferInsert;

type StoreScope = {
  storeId?: string;
  storeIds?: string[];
};

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

function resolveStoreId(context: TenantContext, input: StoreScope): string | undefined {
  const storeId = input.storeId ?? (context.storeIds?.length === 1 ? context.storeIds[0] : undefined);

  if (storeId && context.storeIds?.length && !context.storeIds.includes(storeId)) {
    throw new Error("Sale store is outside the current store scope.");
  }

  return storeId;
}

function toDate(value?: string): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!value) {
    return null;
  }

  return new Date(value);
}

function mapSale(row: SaleRow): Sale {
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

function createInsert(context: TenantContext, input: CreateSaleInput): SaleInsert {
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

function createUpdate(context: TenantContext, input: UpdateSaleInput): Partial<SaleInsert> {
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

export function createDrizzleSalesRepository(db: Database): SalesRepository {
  return {
    async list(context) {
      const rows = await db
        .select()
        .from(sales)
        .where(scopedWhere(context))
        .orderBy(desc(sales.deliveryDate), desc(sales.createdAt));

      return rows.map(mapSale);
    },

    async listPending(context) {
      const rows = await db
        .select()
        .from(sales)
        .where(and(scopedWhere(context), eq(sales.deliveryStatus, "pending")))
        .orderBy(sales.deliveryDate, desc(sales.createdAt));

      return rows.map(mapSale);
    },

    async create(context, input) {
      const [row] = await db.insert(sales).values(createInsert(context, input)).returning();

      if (!row) {
        throw new Error("Sale was not created.");
      }

      return mapSale(row);
    },

    async findById(context, saleId) {
      const [row] = await db.select().from(sales).where(scopedWhere(context, saleId)).limit(1);
      return row ? mapSale(row) : null;
    },

    async update(context, saleId, input): Promise<SaleMutationResult> {
      const previousSale = await this.findById(context, saleId);

      if (!previousSale) {
        throw new Error("Sale not found.");
      }

      const [row] = await db.update(sales).set(createUpdate(context, input)).where(scopedWhere(context, saleId)).returning();

      if (!row) {
        throw new Error("Sale was not updated.");
      }

      return {
        sale: mapSale(row),
        previousSale,
      };
    },

    async delete(context, saleId) {
      const previousSale = await this.findById(context, saleId);

      if (!previousSale) {
        throw new Error("Sale not found.");
      }

      const [row] = await db.delete(sales).where(scopedWhere(context, saleId)).returning();

      if (!row) {
        throw new Error("Sale was not deleted.");
      }

      return mapSale(row);
    },
  };
}
