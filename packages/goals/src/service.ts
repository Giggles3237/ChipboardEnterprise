import type { AuditLogEntry, EnterpriseEvent } from "@chipboard/shared";
import type { Goal, GoalInput, GoalsRepository, GoalTenantContext } from "./goal.js";

export type GoalsEventPublisher = {
  publish(event: EnterpriseEvent): Promise<void>;
};

export type GoalsAuditLogger = {
  record(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<void>;
};

export type GoalsServiceOptions = {
  repository: GoalsRepository;
  events?: GoalsEventPublisher;
  audit?: GoalsAuditLogger;
  idFactory?: () => string;
  now?: () => string;
};

export class GoalsService {
  private readonly repository: GoalsRepository;
  private readonly events?: GoalsEventPublisher;
  private readonly audit?: GoalsAuditLogger;
  private readonly idFactory: () => string;
  private readonly now: () => string;

  constructor(options: GoalsServiceOptions) {
    this.repository = options.repository;
    this.events = options.events;
    this.audit = options.audit;
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date().toISOString());
  }

  getAdvisorGoal(context: GoalTenantContext, advisorName: string, month: string): Promise<Goal | null> {
    this.assertTenantContext(context);
    return this.repository.getAdvisorGoal(context, advisorName, month);
  }

  listMonthGoals(context: GoalTenantContext, month: string): Promise<Goal[]> {
    this.assertTenantContext(context);
    return this.repository.listMonthGoals(context, month);
  }

  getStoredTeamGoal(context: GoalTenantContext, month: string): Promise<Goal | null> {
    this.assertTenantContext(context);
    return this.repository.getStoredTeamGoal(context, month);
  }

  getCalculatedTeamGoal(context: GoalTenantContext, month: string): Promise<number> {
    this.assertTenantContext(context);
    return this.repository.getCalculatedTeamGoal(context, month);
  }

  async upsertGoal(context: GoalTenantContext, input: GoalInput): Promise<Goal> {
    this.assertTenantContext(context);
    this.assertGoalInput(input);

    const result = await this.repository.upsertGoal(context, input);
    const eventType = result.previousGoal ? "goal.updated" : "goal.created";

    await this.publish(context, eventType, {
      goal: result.goal,
      previousGoal: result.previousGoal,
    });
    await this.publish(context, "leaderboard.recalculated", {
      reason: eventType,
      month: result.goal.month,
    });
    await this.audit?.record({
      organizationId: context.organizationId,
      actorUserId: context.actorUserId,
      action: result.previousGoal ? "update" : "create",
      entityType: "goal",
      entityId: result.goal.id ?? `${result.goal.advisorName}:${result.goal.month}`,
      previousValue: result.previousGoal,
      newValue: result.goal,
    });

    return result.goal;
  }

  private assertTenantContext(context: GoalTenantContext): void {
    if (!context.organizationId) {
      throw new Error("Organization access required.");
    }
  }

  private assertGoalInput(input: GoalInput): void {
    if (!input.advisorName || !input.month || input.goalCount === undefined || input.goalCount === null) {
      throw new Error("Advisor, month, and goal count are required.");
    }

    if (!Number.isFinite(input.goalCount) || input.goalCount < 0) {
      throw new Error("Goal count must be a non-negative number.");
    }
  }

  private async publish(context: GoalTenantContext, type: EnterpriseEvent["type"], payload: Record<string, unknown>): Promise<void> {
    await this.events?.publish({
      id: this.idFactory(),
      organizationId: context.organizationId,
      type,
      payload,
      actorUserId: context.actorUserId,
      occurredAt: this.now(),
      correlationId: context.correlationId,
    });
  }
}
