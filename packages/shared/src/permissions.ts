export const enterprisePermissions = [
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
] as const;

export type EnterprisePermission = (typeof enterprisePermissions)[number];

export type RoleTemplate = {
  key: string;
  name: string;
  description: string;
  permissions: EnterprisePermission[];
};

export const defaultRoleTemplates: RoleTemplate[] = [
  {
    key: "owner",
    name: "Owner",
    description: "Full platform administration across an organization.",
    permissions: [...enterprisePermissions],
  },
  {
    key: "executive",
    name: "Executive",
    description: "Group-level visibility into stores, reports, goals, and audit history.",
    permissions: [
      "sales:read",
      "goals:read",
      "contests:read",
      "leaderboards:read",
      "reports:read",
      "reports:export",
      "users:read",
      "audit:read",
    ],
  },
  {
    key: "manager",
    name: "Manager",
    description: "Store-level operations for sales, goals, contests, and coaching.",
    permissions: [
      "sales:read",
      "sales:create",
      "sales:update",
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
    description: "Personal sales entry, leaderboard visibility, and goal progress.",
    permissions: ["sales:read", "sales:create", "goals:read", "contests:read", "leaderboards:read"],
  },
];
