# Chipboard Enterprise

Chipboard Enterprise is the second-generation platform direction for Chipboard. The imported app in `apps/chipboard` remains the working reference implementation, while this workspace introduces the modular SaaS foundation for multi-store dealership operations.

## Product Direction

Chipboard is moving from a single-dealership sales board into a dealership operations platform. The first enterprise release should focus on sales tracking, live leaderboards, goals, and contests, while the architecture is prepared for rewards, inventory, service scoreboards, finance production, executive dashboards, TV displays, integrations, and AI insights.

## Workspace Layout

- `apps/web`: Next.js enterprise web shell.
- `apps/chipboard`: Imported Chipboard Classic implementation for reference and migration.
- `packages/shared`: Tenant, event, permission, feature flag, integration, and audit contracts.
- `packages/auth`: Enterprise authentication and authorization helpers.
- `packages/database`: Database table plan and schema contracts.
- `packages/validation`: Shared validation rules.
- `packages/ui`: Shared React component package.
- `docs`: Architecture, database, and roadmap notes.

## Enterprise Principles

- Every customer-owned record is scoped by `organizationId`.
- Stores, departments, users, roles, permissions, and feature flags are first-class platform concepts.
- Business logic lives in services and domain packages, not React components.
- The API should be useful without the web app so future mobile, TV, and integration clients can build on it.
- Important changes produce audit log entries.
- Domain changes emit events so leaderboards, contests, goals, rewards, and notifications can evolve independently.
- Integrations are provider-based rather than dealership-specific.
- Branding, colors, logos, timezone, working hours, and scoring rules are configuration.

## Useful Commands

```sh
pnpm check-types
pnpm --filter @chipboard/chipboard test
pnpm --filter @chipboard/shared check-types
```

## Migration Approach

1. Keep `apps/chipboard` functional as Chipboard Classic.
2. Extract stable domain rules into packages.
3. Build tenant-scoped API boundaries.
4. Move the Next.js web app onto the enterprise contracts.
5. Replace legacy auth and persistence with organization-aware services.
