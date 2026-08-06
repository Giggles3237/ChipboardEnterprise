import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const organizationStatus = pgEnum("organization_status", ["trial", "active", "suspended", "archived"]);
export const storeStatus = pgEnum("store_status", ["active", "inactive"]);
export const userStatus = pgEnum("user_status", ["invited", "active", "disabled"]);
export const departmentType = pgEnum("department_type", ["sales", "finance", "service", "parts", "operations"]);
export const saleDeliveryStatus = pgEnum("sale_delivery_status", ["pending", "delivered", "cancelled"]);
export const auditActionType = pgEnum("audit_action_type", ["create", "update", "delete", "login", "export", "import"]);
export const eventStatus = pgEnum("event_status", ["pending", "processing", "processed", "failed"]);

const id = uuid("id").defaultRandom().primaryKey();
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const organizations = pgTable(
  "organizations",
  {
    id,
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 63 }).notNull(),
    status: organizationStatus("status").default("trial").notNull(),
    timezone: varchar("timezone", { length: 80 }).default("America/New_York").notNull(),
    ...timestamps,
  },
  (table) => ({
    slugIdx: uniqueIndex("organizations_slug_idx").on(table.slug),
  })
);

export const stores = pgTable(
  "stores",
  {
    id,
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    timezone: varchar("timezone", { length: 80 }).default("America/New_York").notNull(),
    status: storeStatus("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => ({
    organizationCodeIdx: uniqueIndex("stores_organization_code_idx").on(table.organizationId, table.code),
  })
);

export const departments = pgTable("departments", {
  id,
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  type: departmentType("type").notNull(),
  ...timestamps,
});

export const users = pgTable(
  "users",
  {
    id,
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    externalAuthId: varchar("external_auth_id", { length: 191 }),
    email: varchar("email", { length: 254 }).notNull(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    status: userStatus("status").default("invited").notNull(),
    ...timestamps,
  },
  (table) => ({
    organizationEmailIdx: uniqueIndex("users_organization_email_idx").on(table.organizationId, table.email),
    externalAuthIdx: uniqueIndex("users_external_auth_idx").on(table.externalAuthId),
  })
);

export const roles = pgTable(
  "roles",
  {
    id,
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    systemRole: boolean("system_role").default(false).notNull(),
    ...timestamps,
  },
  (table) => ({
    organizationKeyIdx: uniqueIndex("roles_organization_key_idx").on(table.organizationId, table.key),
  })
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 80 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permission] }),
    organizationIdx: index("role_permissions_organization_idx").on(table.organizationId),
  })
);

export const userRoles = pgTable(
  "user_roles",
  {
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
    organizationIdx: index("user_roles_organization_idx").on(table.organizationId),
  })
);

export const sales = pgTable(
  "sales",
  {
    id,
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    salespersonUserId: uuid("salesperson_user_id").references(() => users.id, { onDelete: "set null" }),
    clientName: varchar("client_name", { length: 160 }).notNull(),
    stockNumber: varchar("stock_number", { length: 80 }).notNull(),
    year: integer("year"),
    make: varchar("make", { length: 80 }),
    model: varchar("model", { length: 120 }),
    color: varchar("color", { length: 80 }),
    deliveryStatus: saleDeliveryStatus("delivery_status").default("pending").notNull(),
    deliveryDate: timestamp("delivery_date", { withTimezone: true }),
    saleType: varchar("sale_type", { length: 80 }),
    sourceSystem: varchar("source_system", { length: 80 }).default("manual").notNull(),
    sourceId: varchar("source_id", { length: 160 }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => ({
    organizationDeliveryDateIdx: index("sales_organization_delivery_date_idx").on(table.organizationId, table.deliveryDate),
    organizationStockIdx: index("sales_organization_stock_idx").on(table.organizationId, table.stockNumber),
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id,
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: auditActionType("action").notNull(),
    entityType: varchar("entity_type", { length: 120 }).notNull(),
    entityId: uuid("entity_id"),
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationCreatedAtIdx: index("audit_logs_organization_created_at_idx").on(table.organizationId, table.createdAt),
  })
);

export const eventOutbox = pgTable(
  "event_outbox",
  {
    id,
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    type: varchar("type", { length: 120 }).notNull(),
    payload: jsonb("payload").notNull(),
    status: eventStatus("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    correlationId: uuid("correlation_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
  },
  (table) => ({
    statusOccurredAtIdx: index("event_outbox_status_occurred_at_idx").on(table.status, table.occurredAt),
    organizationOccurredAtIdx: index("event_outbox_organization_occurred_at_idx").on(table.organizationId, table.occurredAt),
  })
);

export type EnterpriseTable =
  | "organizations"
  | "stores"
  | "departments"
  | "users"
  | "roles"
  | "role_permissions"
  | "user_roles"
  | "feature_flags"
  | "brand_themes"
  | "vehicles"
  | "sales"
  | "goals"
  | "contests"
  | "contest_participants"
  | "leaderboards"
  | "rewards"
  | "notifications"
  | "integration_connections"
  | "event_outbox"
  | "audit_logs";

export type TableRequirement = {
  table: EnterpriseTable;
  tenantScoped: boolean;
  auditChanges: boolean;
  notes: string;
};

export const enterpriseSchemaPlan: TableRequirement[] = [
  {
    table: "organizations",
    tenantScoped: false,
    auditChanges: true,
    notes: "Top-level tenant record. All customer-owned data hangs from this.",
  },
  {
    table: "stores",
    tenantScoped: true,
    auditChanges: true,
    notes: "Dealership rooftops within an organization.",
  },
  {
    table: "departments",
    tenantScoped: true,
    auditChanges: true,
    notes: "Sales, finance, service, parts, and operations groupings.",
  },
  {
    table: "users",
    tenantScoped: true,
    auditChanges: true,
    notes: "Application users mapped to external auth identities.",
  },
  {
    table: "roles",
    tenantScoped: true,
    auditChanges: true,
    notes: "Custom customer roles composed from granular permissions.",
  },
  {
    table: "role_permissions",
    tenantScoped: true,
    auditChanges: true,
    notes: "Permission assignments for each custom role.",
  },
  {
    table: "sales",
    tenantScoped: true,
    auditChanges: true,
    notes: "Normalized sale records, never tied to a single dealership name.",
  },
  {
    table: "event_outbox",
    tenantScoped: true,
    auditChanges: false,
    notes: "Reliable event stream for leaderboards, contests, goals, and notifications.",
  },
  {
    table: "audit_logs",
    tenantScoped: true,
    auditChanges: false,
    notes: "Immutable trail of important customer data changes.",
  },
];