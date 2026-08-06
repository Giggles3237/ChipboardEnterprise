export const enterpriseEventTypes = [
  "organization.created",
  "store.created",
  "user.invited",
  "role.assigned",
  "sale.created",
  "sale.updated",
  "sale.deleted",
  "goal.created",
  "goal.updated",
  "contest.created",
  "contest.closed",
  "leaderboard.recalculated",
  "reward.awarded",
  "notification.queued",
  "integration.sync.completed",
  "feature.enabled",
  "feature.disabled",
] as const;

export type EnterpriseEventType = (typeof enterpriseEventTypes)[number];

export type EnterpriseEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  organizationId: string;
  storeId?: string;
  type: EnterpriseEventType;
  payload: TPayload;
  actorUserId?: string;
  occurredAt: string;
  correlationId?: string;
};
