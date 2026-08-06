export type TenantContext = {
  organizationId: string;
  actorUserId?: string;
  storeIds?: string[];
  correlationId?: string;
};

export type SaleDeliveryStatus = "pending" | "delivered" | "cancelled";

export type Sale = {
  id: string;
  organizationId: string;
  storeId?: string;
  salespersonUserId?: string;
  clientName: string;
  stockNumber: string;
  year?: number;
  make?: string;
  model?: string;
  color?: string;
  advisor?: string;
  deliveryStatus: SaleDeliveryStatus;
  deliveryDate?: string;
  saleType?: string;
  sourceSystem: string;
  sourceId?: string;
  createdByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateSaleInput = {
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

export type UpdateSaleInput = Partial<Omit<CreateSaleInput, "stockNumber">> & {
  stockNumber?: string;
};

export type SaleMutationResult = {
  sale: Sale;
  previousSale?: Sale;
};

export type SalesRepository = {
  list(context: TenantContext): Promise<Sale[]>;
  listPending(context: TenantContext): Promise<Sale[]>;
  create(context: TenantContext, input: CreateSaleInput): Promise<Sale>;
  findById(context: TenantContext, saleId: string): Promise<Sale | null>;
  update(context: TenantContext, saleId: string, input: UpdateSaleInput): Promise<SaleMutationResult>;
  delete(context: TenantContext, saleId: string): Promise<Sale>;
};
