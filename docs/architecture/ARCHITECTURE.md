# Chipboard Architecture

## Architecture Style

Chipboard begins as a modular monolith inside a Turborepo workspace.

The initial product contains one deployable web application with shared
internal packages for database access, authentication, validation, UI,
and common types.

## Applications

### apps/web

The main Next.js application.

Responsibilities:

- User interface
- Server-rendered pages
- API route handlers
- Authentication enforcement
- Business workflow orchestration

## Shared Packages

### packages/database

Database schema, migrations, database client, and data access.

### packages/auth

Authentication and authorization helpers.

### packages/ui

Reusable interface components.

### packages/validation

Shared Zod schemas and input validation.

### packages/shared

Shared types, constants, utilities, and domain definitions.

## Tenant Model

Every customer is an organization.

An organization may contain multiple stores.

Business records must be associated with an organization and, where
appropriate, a store.

No query may expose one organization's data to another organization.