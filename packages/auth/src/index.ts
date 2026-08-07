import type { EnterprisePermission, RoleTemplate } from "@chipboard/shared";

export type AuthProvider = "clerk" | "better-auth" | "authjs" | "legacy-jwt";

export type TenantPrincipal = {
  userId: string;
  organizationId: string;
  storeIds: string[];
  roleIds: string[];
  permissions: EnterprisePermission[];
  provider: AuthProvider;
};

export type InvitationPolicy = {
  organizationId: string;
  allowedDomains: string[];
  defaultRoleKeys: string[];
  requireMfa: boolean;
};

export function can(principal: TenantPrincipal, permission: EnterprisePermission): boolean {
  return principal.permissions.includes(permission);
}

export function roleHasPermission(role: RoleTemplate, permission: EnterprisePermission): boolean {
  return role.permissions.includes(permission);
}

export function assertTenantAccess(principal: TenantPrincipal, organizationId: string): void {
  if (principal.organizationId !== organizationId) {
    throw new Error("Cross-organization access denied.");
  }
}

export type StoreAccessScope = {
  organizationId: string;
  storeIds: string[];
  allStores: boolean;
};

export const enterpriseDefaultRoles: RoleTemplate[] = [
  {
    key: "owner",
    name: "Owner",
    description: "Organization owner with full platform access across all stores.",
    permissions: [
      "sales:read",
      "sales:create",
      "sales:update",
      "sales:delete",
      "goals:read",
      "goals:manage",
      "contests:read",
      "contests:manage",
      "leaderboards:read",
      "reports:read",
      "reports:export",
      "users:read",
      "users:manage",
      "roles:manage",
      "stores:manage",
      "features:manage",
      "integrations:manage",
      "audit:read",
    ],
  },
  {
    key: "admin",
    name: "Admin",
    description: "Organization administrator for users, roles, settings, and reporting.",
    permissions: [
      "sales:read",
      "sales:create",
      "sales:update",
      "sales:delete",
      "goals:read",
      "goals:manage",
      "contests:read",
      "contests:manage",
      "leaderboards:read",
      "reports:read",
      "reports:export",
      "users:read",
      "users:manage",
      "roles:manage",
      "stores:manage",
      "features:manage",
      "integrations:manage",
      "audit:read",
    ],
  },
  {
    key: "manager",
    name: "Manager",
    description: "Store-scoped manager for sales operations, goals, contests, and team reporting.",
    permissions: [
      "sales:read",
      "sales:create",
      "sales:update",
      "sales:delete",
      "goals:read",
      "goals:manage",
      "contests:read",
      "contests:manage",
      "leaderboards:read",
      "reports:read",
      "users:read",
    ],
  },
  {
    key: "salesperson",
    name: "Salesperson",
    description: "Salesperson access for personal sales activity, goals, and leaderboards.",
    permissions: ["sales:read", "sales:create", "goals:read", "contests:read", "leaderboards:read"],
  },
];
