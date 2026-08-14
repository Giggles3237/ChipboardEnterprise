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
```

The enterprise database is Azure Database for PostgreSQL Flexible Server. Details live in `docs/database.md`.

## Auth And Observability Variables

These can be added when their services are enabled:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

Clerk Organizations is the preferred first auth provider in the architecture notes. Add Clerk callback URLs after the Vercel preview URL or production domain exists.

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

The current app is deployable as a branded enterprise shell with a basic health endpoint. Before treating it as production customer software, complete these items:

- Apply and verify initial PostgreSQL migrations against Azure.
- Add database-backed readiness checks once the database client is used by `apps/web`.
- Add Clerk Organizations and protect customer-facing routes.
- Replace placeholder dashboard metrics with tenant-scoped APIs.
- Add CI checks for typecheck, build, and migration validation.
