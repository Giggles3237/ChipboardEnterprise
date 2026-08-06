import type { EnterprisePermission } from "./permissions.js";

export type EntityId = string;

export type Organization = {
  id: EntityId;
  name: string;
  slug: string;
  status: "trial" | "active" | "suspended" | "archived";
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type Store = {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  code: string;
  timezone: string;
  status: "active" | "inactive";
};

export type Department = {
  id: EntityId;
  organizationId: EntityId;
  storeId: EntityId;
  name: string;
  type: "sales" | "finance" | "service" | "parts" | "operations";
};

export type EnterpriseUser = {
  id: EntityId;
  organizationId: EntityId;
  storeIds: EntityId[];
  email: string;
  displayName: string;
  status: "invited" | "active" | "disabled";
  roleIds: EntityId[];
};

export type Role = {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  description?: string;
  permissions: EnterprisePermission[];
  systemRole: boolean;
};

export type FeatureKey =
  | "salesTracking"
  | "leaderboards"
  | "goals"
  | "contests"
  | "rewards"
  | "tvDisplays"
  | "inventory"
  | "emailNotifications"
  | "calendarIntegrations"
  | "executiveDashboards"
  | "aiInsights";

export type FeatureFlag = {
  organizationId: EntityId;
  feature: FeatureKey;
  enabled: boolean;
  configuredAt: string;
  configuredByUserId?: EntityId;
};

export type BrandTheme = {
  organizationId: EntityId;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  neutralColor: string;
  displayName: string;
};

export type IntegrationProvider = "dealertrack" | "reynolds" | "cdk" | "vauto" | "tekion" | "manual";

export type IntegrationConnection = {
  id: EntityId;
  organizationId: EntityId;
  storeId?: EntityId;
  provider: IntegrationProvider;
  status: "pending" | "connected" | "error" | "disabled";
  lastSyncedAt?: string;
};

export type AuditLogEntry = {
  id: EntityId;
  organizationId: EntityId;
  actorUserId?: EntityId;
  action: string;
  entityType: string;
  entityId: EntityId;
  previousValue?: unknown;
  newValue?: unknown;
  createdAt: string;
};
