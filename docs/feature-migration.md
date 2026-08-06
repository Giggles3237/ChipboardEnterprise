# Feature Migration Map

This map turns Chipboard Classic into enterprise migration slices. Each slice should keep Classic working while moving business logic into tenant-aware packages and services.

## Current Checkpoint

- `apps/chipboard` is Chipboard Classic inside the enterprise workspace.
- `packages/sales` defines the first enterprise domain service.
- Classic sales routes now use a service/repository adapter.
- Sales mutations write audit records and event outbox records.

## Migration Order

### 1. Identity, Organizations, and RBAC

Classic surface:

- `routes/auth.js`
- `routes/users.js`
- `AdminDashboard`
- `Login`
- `Register`
- `ChangePasswordForm`
- `TrainingManagement`

Enterprise target:

- Expand `packages/auth` from helper functions into an auth boundary.
- Introduce organization membership, store access, role assignment, and permission checks.
- Replace role strings like `Admin`, `Manager`, and `Salesperson` with permission-based policies.
- Keep legacy JWT compatibility until Clerk or another organization-aware provider is wired.

Why first:

Every feature needs reliable `organizationId`, actor identity, and permission checks.

### 2. Sales, Goals, and Leaderboards

Classic surface:

- `routes/sales.js`
- `routes/goals.js`
- `ChipTable`
- `MonthlyGoal`
- `TeamGoal`
- `Totals`
- `ManagerDashboard`
- `SalespersonDashboard`
- `TVDashboard`
- `TVScreenLeaderboard`
- `TVScreenPaceTracker`

Enterprise target:

- Finish `packages/sales` migration with a Postgres repository.
- Add `packages/goals`.
- Add `packages/leaderboards` as event-derived read models.
- Process `sale.created`, `sale.updated`, `sale.deleted`, and `goal.updated` events into leaderboard rows.
- Move dashboard calculations out of React components.

Why next:

This is the product core and the best place to prove the event-driven platform model.

### 3. Contests and Rewards

Classic surface:

- `routes/contests.js`
- `ContestDashboard`
- contest-aware navbar behavior

Enterprise target:

- Add `packages/contests`.
- Model contest rules, participants, scoring, publishing, bonuses, closing, and rewards.
- Consume sales and goal events instead of recalculating directly from UI state.
- Emit `contest.created`, `contest.closed`, and `reward.awarded` events.

Why after leaderboards:

Contests depend on sales facts, scoring rules, and leaderboard-style aggregation.

### 4. Inventory and Vehicle Search

Classic surface:

- `routes/vehicles.js`
- `routes/unifiedVehicles.js`
- `routes/keys.js`
- `SearchUnifiedVehicles`
- `VehicleDetailsModal`

Enterprise target:

- Add `packages/inventory`.
- Define provider interfaces for manual CSV, DealerTrack, Reynolds, CDK, vAuto, and Tekion.
- Normalize vehicle records by organization and store.
- Treat upload/import jobs as auditable events.

Why here:

Vehicle data supports sales workflows, inbound, keys, and future DMS integrations.

### 5. Loaners and Pricing

Classic surface:

- `routes/loaners.js`
- `routes/loanerPricing.js`
- `LoanerSheet`
- `LoanerUpload`
- `LoanerSettings`
- `Inbound`
- `InboundUnit`
- `lib/loanerChanges.js`
- `lib/pricing.js`
- `lib/report.js`
- `lib/settings.js`

Enterprise target:

- Add `packages/loaners`.
- Move pricing, settings, reports, imports, and change detection into services.
- Scope all settings and generated reports by organization/store.
- Emit events for loaner request, pricing import, pricing change, and report generated.

Why after inventory:

Loaner pricing depends heavily on vehicle/fleet data and file imports.

### 6. Notifications and Get Ready

Classic surface:

- `routes/notifications.js`
- `routes/getready.js`
- `Notifications`
- `EditSaleForm` email and loaner side effects
- `utils/getReadyEmail.js`
- `utils/emailExcel.js`
- `utils/gmailExcel.js`
- `utils/webhook.js`

Enterprise target:

- Add `packages/notifications`.
- Model notification channels: in-app, email, Teams, future Slack.
- Move Get Ready escalation into a workflow service.
- Connect notification dispatch to the event outbox.

Why here:

Notifications should be reactions to durable domain events, not direct route side effects.

### 7. Activities, Analysis, Reports, and AI

Classic surface:

- `routes/activities.js`
- `routes/analysis.js`
- `lib/calculatorImport.js`
- `lib/parsers.js`
- `utils/delegatedAuth.js`
- `utils/test-sharepoint-file.js`

Enterprise target:

- Add `packages/reports`.
- Add `packages/integrations`.
- Make report generation, import parsing, SharePoint/email access, and analysis jobs tenant-aware.
- Emit audit entries for imports, exports, and AI-assisted analysis.

Why later:

These features are valuable but should sit on top of stable identity, sales, inventory, and event foundations.

### 8. Enterprise Web App

Classic surface:

- CRA frontend in `apps/chipboard/frontend`
- Next.js shell in `apps/web`

Enterprise target:

- Build `apps/web` as the primary enterprise UI.
- Use shared domain contracts and typed API clients.
- Add organization/store switching, feature-flagged navigation, and white-label theming.
- Migrate Classic screens one module at a time instead of porting the whole UI at once.

Why last in each slice:

The UI should follow stable services. Each feature should migrate backend contract first, then screen.

## Recommended Next Slice

Start with Identity/RBAC because it unlocks every other migration. The implementation should:

1. Add tenant-aware user and role types to `packages/auth`.
2. Extract Classic user route logic into `apps/chipboard/services/usersService.js`.
3. Add audit/outbox writes for user create, profile update, role update, status update, password change, and delete.
4. Add tests that user mutations are organization-scoped and permission-gated.
5. Keep Classic JWT behavior until the enterprise auth provider is selected.
