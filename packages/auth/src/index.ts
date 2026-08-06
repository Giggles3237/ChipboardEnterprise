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
