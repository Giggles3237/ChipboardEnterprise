# Roadmap

## Phase 1: Foundation

- Keep Chipboard Classic running in `apps/chipboard`.
- Establish shared enterprise contracts.
- Define tenant, RBAC, feature flag, event, audit, and integration primitives.
- Document architecture, database conventions, and migration strategy.

## Phase 2: Platform Shell

- Build the Next.js enterprise app shell in `apps/web`.
- Add organization and store switching.
- Add role-aware navigation.
- Add white-label theme settings.

## Phase 3: Sales and Leaderboards

- Extract sales service logic from the classic app.
- Add tenant-scoped sales APIs.
- Build live leaderboard read models from events.
- Add audit logging for sale edits and deletes.

## Phase 4: Goals and Contests

- Move goal and contest calculations into domain services.
- Make scoring rules configurable per organization.
- Add rewards and achievement primitives.

## Phase 5: Enterprise Readiness

- Add Clerk Organizations or equivalent auth.
- Add PostgreSQL migrations.
- Add integration provider interfaces.
- Add monitoring, analytics, CI, and deployment workflows.
- Address dependency audit findings inherited from Chipboard Classic.
