import type { AuditLogEntry, EnterpriseEvent } from "@chipboard/shared";
import type { CreateSaleInput, Sale, SalesRepository, TenantContext, UpdateSaleInput } from "./sale.js";

export type SalesEventPublisher = {
  publish(event: EnterpriseEvent): Promise<void>;
};

export type SalesAuditLogger = {
  record(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<void>;
};

export type SalesServiceOptions = {
  repository: SalesRepository;
  events?: SalesEventPublisher;
  audit?: SalesAuditLogger;
  idFactory?: () => string;
  now?: () => string;
};

export class SalesService {
  private readonly repository: SalesRepository;
  private readonly events?: SalesEventPublisher;
  private readonly audit?: SalesAuditLogger;
  private readonly idFactory: () => string;
  private readonly now: () => string;

  constructor(options: SalesServiceOptions) {
    this.repository = options.repository;
    this.events = options.events;
    this.audit = options.audit;
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date().toISOString());
  }

  listSales(context: TenantContext): Promise<Sale[]> {
    this.assertTenantContext(context);
    return this.repository.list(context);
  }

  listPendingSales(context: TenantContext): Promise<Sale[]> {
    this.assertTenantContext(context);
    return this.repository.listPending(context);
  }

  async createSale(context: TenantContext, input: CreateSaleInput): Promise<Sale> {
    this.assertTenantContext(context);
    this.assertRequiredCreateFields(input);

    const sale = await this.repository.create(context, input);

    await this.publish(context, "sale.created", { sale });
    await this.audit?.record({
      organizationId: context.organizationId,
      actorUserId: context.actorUserId,
      action: "create",
      entityType: "sale",
      entityId: sale.id,
      newValue: sale,
    });

    return sale;
  }

  async updateSale(context: TenantContext, saleId: string, input: UpdateSaleInput): Promise<Sale> {
    this.assertTenantContext(context);

    const result = await this.repository.update(context, saleId, input);

    await this.publish(context, "sale.updated", {
      sale: result.sale,
      previousSale: result.previousSale,
    });
    await this.audit?.record({
      organizationId: context.organizationId,
      actorUserId: context.actorUserId,
      action: "update",
      entityType: "sale",
      entityId: result.sale.id,
      previousValue: result.previousSale,
      newValue: result.sale,
    });

    return result.sale;
  }

  async deleteSale(context: TenantContext, saleId: string): Promise<Sale> {
    this.assertTenantContext(context);

    const sale = await this.repository.delete(context, saleId);

    await this.publish(context, "sale.deleted", { sale });
    await this.audit?.record({
      organizationId: context.organizationId,
      actorUserId: context.actorUserId,
      action: "delete",
      entityType: "sale",
      entityId: sale.id,
      previousValue: sale,
    });

    return sale;
  }

  private assertTenantContext(context: TenantContext): void {
    if (!context.organizationId) {
      throw new Error("Organization access required.");
    }
  }

  private assertRequiredCreateFields(input: CreateSaleInput): void {
    const missing = ["clientName", "stockNumber", "year", "make", "model"].filter((field) => {
      const value = input[field as keyof CreateSaleInput];
      return value === undefined || value === null || value === "";
    });

    if (missing.length > 0) {
      throw new Error(`Missing required sale fields: ${missing.join(", ")}`);
    }
  }

  private async publish(context: TenantContext, type: EnterpriseEvent["type"], payload: Record<string, unknown>): Promise<void> {
    await this.events?.publish({
      id: this.idFactory(),
      organizationId: context.organizationId,
      type,
      payload,
      actorUserId: context.actorUserId,
      occurredAt: this.now(),
      correlationId: context.correlationId,
    });
  }
}
