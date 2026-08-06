# Database

The enterprise database should be PostgreSQL-first and tenant-scoped.

## Core Tables

- `organizations`
- `stores`
- `departments`
- `users`
- `roles`
- `role_permissions`
- `feature_flags`
- `brand_themes`
- `vehicles`
- `sales`
- `goals`
- `contests`
- `contest_participants`
- `leaderboards`
- `rewards`
- `notifications`
- `integration_connections`
- `event_outbox`
- `audit_logs`

## Required Conventions

- Customer-owned tables include `organization_id`.
- Store-specific data includes `store_id` when applicable.
- Mutable tables include `created_at`, `updated_at`, and preferably `created_by_user_id`.
- Important mutations write to `audit_logs`.
- Domain events are inserted into `event_outbox` in the same transaction as the business change.
- Database constraints should enforce tenant boundaries wherever possible.

## Migration Notes

Chipboard Classic has dealership-specific assumptions and mixed persistence patterns. During migration, prefer writing new services against the enterprise table plan and adapt old routes one domain at a time.

## Azure PostgreSQL Setup

The enterprise database is Azure Database for PostgreSQL Flexible Server:

- Resource group: `ChipBoard`
- Server: `chipboard-prod-pg`
- Host: `chipboard-prod-pg.postgres.database.azure.com`
- Database: `chipboard`
- Admin login: `Giggles3237`
- Required connection mode: TLS with `sslmode=require`

Local development should set `DATABASE_URL` in an uncommitted `.env` file:

```env
DATABASE_URL=postgresql://Giggles3237:<password>@chipboard-prod-pg.postgres.database.azure.com:5432/chipboard?sslmode=require
```

Useful commands:

```sh
pnpm db:check
pnpm db:generate
pnpm db:migrate
```

`pnpm db:check` verifies connectivity. `pnpm db:generate` creates SQL migrations from the Drizzle schema. `pnpm db:migrate` applies checked-in migrations to the configured database.