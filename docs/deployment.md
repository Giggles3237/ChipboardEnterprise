# Deployment

Chipboard Enterprise deploys from the Next.js app in `apps/web`. Chipboard Classic remains separate in `apps/chipboard` and should not be used as the enterprise deployment target.

## Recommended Host

Use Vercel for the first enterprise deployment because `apps/web` is a Next.js application inside a pnpm/Turborepo workspace.

Vercel project settings:

- Framework preset: Next.js
- Root directory: `apps/web`
- Install command: `pnpm install`
- Build command: `pnpm --filter @chipboard/web build`
- Output directory: leave as Vercel default for Next.js
- Node.js version: 22.x, or the current Vercel default that supports Next.js 16

## Required Environment Variables

Set these in the Vercel project before a production deployment:

```env
NEXT_PUBLIC_APP_URL=https://<production-domain>
DATABASE_URL=postgresql://<user>:<password>@chipboard-prod-pg.postgres.database.azure.com:5432/chipboard?sslmode=require
APP_SESSION_SECRET=<at-least-32-random-characters>
```

The enterprise database is Azure Database for PostgreSQL Flexible Server. Details live in `docs/database.md`.

## Auth And Observability Variables

These can be added when their services are enabled:

```env
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

Chipboard Enterprise will use in-app user administration: dealer groups, stores, users, roles, and permissions are managed in the application database.

## Preflight Checks

Run these before deployment:

```sh
pnpm --filter @chipboard/web check-types
pnpm --filter @chipboard/web build
```

After deployment, verify:

```sh
curl https://<deployment-domain>/api/health
```

Expected response includes `ok: true` and `service: "chipboard-enterprise-web"`.

## Current Deployment Scope

The current app is deployable as a branded enterprise shell with setup, sales, and health endpoints. Before treating it as production customer software, complete these items:

- Apply and verify initial PostgreSQL migrations against Azure.
- Add database-backed readiness checks once the database client is used by `apps/web`.
- Use `/admin` to create the first users with passwords, then promote admin into a protected role-based area with store assignments.
- Replace placeholder dashboard metrics with tenant-scoped APIs.
- Add CI checks for typecheck, build, and migration validation.



