import { enterprisePermissions, type FeatureKey } from "@chipboard/shared";

export type ValidationResult = {
  valid: boolean;
  issues: string[];
};

export function validateOrganizationSlug(slug: string): ValidationResult {
  const issues: string[] = [];

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    issues.push("Organization slugs must be lowercase words separated by single hyphens.");
  }

  if (slug.length < 3 || slug.length > 63) {
    issues.push("Organization slugs must be between 3 and 63 characters.");
  }

  return { valid: issues.length === 0, issues };
}

export function validatePermissions(permissions: string[]): ValidationResult {
  const allowed = new Set<string>(enterprisePermissions);
  const issues = permissions
    .filter((permission) => !allowed.has(permission))
    .map((permission) => `Unknown permission: ${permission}`);

  return { valid: issues.length === 0, issues };
}

export function validateFeatureFlag(feature: FeatureKey, enabled: boolean): ValidationResult {
  const issues: string[] = [];

  if (typeof feature !== "string") {
    issues.push("Feature key is required.");
  }

  if (typeof enabled !== "boolean") {
    issues.push("Feature enabled state must be boolean.");
  }

  return { valid: issues.length === 0, issues };
}
