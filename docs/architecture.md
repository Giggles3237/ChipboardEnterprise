# Architecture

Chipboard Enterprise is designed as a multi-tenant platform rather than a dealership-specific application.

## Layers

```text
Web and external clients
API
Domain services
Repositories
Database and integrations
Events and background jobs
```

React should render workflows and call APIs. It should not own contest scoring, goal calculations, permissions, provider mapping, or audit decisions.

## Tenancy

`Organization` is the root tenant. Stores, departments, users, roles, sales, goals, contests, rewards, notifications, integrations, and audit logs are scoped to an organization.

Every service method that reads or mutates customer data should receive tenant context:

```ts
{
  organizationId: string;
  storeIds: string[];
  actorUserId?: string;
}
```

## Domains

- Organizations: tenant lifecycle, branding, feature flags, billing state.
- Stores: rooftops, timezone, departments, working hours.
- Users and roles: invitations, RBAC, store access, permission checks.
- Sales: deal capture, edits, imports, exportable reporting data.
- Goals: individual, team, store, and organization targets.
- Contests: scoring rules, participants, eligibility, rewards.
- Leaderboards: read models derived from sales, goals, and contest events.
- Notifications: email, in-app, TV display, and future Slack/Teams channels.
- Integrations: DMS, inventory, CRM, email, calendar, and storage providers.
- Audit: immutable history for important business changes.

## Events

Domain services should emit events for important changes:

- `sale.created`
- `goal.updated`
- `contest.closed`
- `leaderboard.recalculated`
- `reward.awarded`
- `notification.queued`

The first implementation can be an outbox table. Later, workers can process events through Inngest, Trigger.dev, or another job system.

## Authentication

The target direction is external enterprise auth with organization support. Clerk Organizations is the preferred first candidate, with the current JWT implementation treated as legacy compatibility during migration.
