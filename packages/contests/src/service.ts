import type { AuditLogEntry, EnterpriseEvent } from "@chipboard/shared";
import type {
  Contest,
  ContestBonusInput,
  ContestDealScoreInput,
  ContestRepository,
  ContestSetupInput,
  ContestTenantContext,
} from "./contest.js";

export type ContestsEventPublisher = {
  publish(event: EnterpriseEvent): Promise<void>;
};

export type ContestsAuditLogger = {
  record(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<void>;
};

export type ContestsServiceOptions = {
  repository: ContestRepository;
  events?: ContestsEventPublisher;
  audit?: ContestsAuditLogger;
  idFactory?: () => string;
  now?: () => string;
};

export class ContestsService {
  private readonly repository: ContestRepository;
  private readonly events?: ContestsEventPublisher;
  private readonly audit?: ContestsAuditLogger;
  private readonly idFactory: () => string;
  private readonly now: () => string;

  constructor(options: ContestsServiceOptions) {
    this.repository = options.repository;
    this.events = options.events;
    this.audit = options.audit;
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async updateSetup(context: ContestTenantContext, contestId: string, input: ContestSetupInput): Promise<Contest> {
    this.assertTenantContext(context);
    this.assertContestId(contestId);
    this.assertSetupInput(input);

    const result = await this.repository.updateSetup(context, contestId, input);
    await this.publish(context, "contest.updated", result);
    await this.recordAudit(context, "update", "contest", contestId, result.previousContest, result.contest);
    return result.contest;
  }

  async scoreDeal(context: ContestTenantContext, contestId: string, saleId: string, input: ContestDealScoreInput): Promise<void> {
    this.assertTenantContext(context);
    this.assertContestId(contestId);
    if (!saleId) throw new Error("Sale id is required.");

    const result = await this.repository.scoreDeal(context, contestId, saleId, input);
    await this.publish(context, "contest.score.updated", {
      contestId,
      saleId,
      score: result.score,
      previousScore: result.previousScore,
    });
    await this.publish(context, "leaderboard.recalculated", { reason: "contest.score.updated", contestId });
    await this.recordAudit(context, result.previousScore ? "update" : "create", "contest_deal_score", saleId, result.previousScore, result.score);
  }

  async publishPendingScores(context: ContestTenantContext, contestId: string): Promise<Contest> {
    this.assertTenantContext(context);
    this.assertContestId(contestId);

    const result = await this.repository.publishPendingScores(context, contestId);
    await this.publish(context, "contest.published", result);
    await this.publish(context, "leaderboard.recalculated", { reason: "contest.published", contestId });
    await this.recordAudit(context, "update", "contest", contestId, result.previousContest, result.contest);
    return result.contest;
  }

  async addBonus(context: ContestTenantContext, contestId: string, input: ContestBonusInput): Promise<void> {
    this.assertTenantContext(context);
    this.assertContestId(contestId);

    if (!input.advisor || !input.reason || !Number(input.points)) {
      const error = new Error("Advisor, reason, and points are required");
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }

    const result = await this.repository.addBonus(context, contestId, input);
    await this.publish(context, "reward.awarded", { contestId, bonus: result.bonus });
    await this.publish(context, "leaderboard.recalculated", { reason: "reward.awarded", contestId });
    await this.recordAudit(context, "create", "contest_bonus", result.bonus.id ?? contestId, undefined, result.bonus);
  }

  async closeContest(context: ContestTenantContext, contestId: string): Promise<Contest> {
    this.assertTenantContext(context);
    this.assertContestId(contestId);

    const result = await this.repository.closeContest(context, contestId);
    await this.publish(context, "contest.closed", result);
    await this.recordAudit(context, "update", "contest", contestId, result.previousContest, result.contest);
    return result.contest;
  }

  private assertTenantContext(context: ContestTenantContext): void {
    if (!context.organizationId) {
      const error = new Error("Organization access required");
      (error as Error & { statusCode?: number }).statusCode = 403;
      throw error;
    }
  }

  private assertContestId(contestId: string): void {
    if (!contestId) throw new Error("Contest id is required.");
  }

  private assertSetupInput(input: ContestSetupInput): void {
    if (!input.contest?.name) {
      const error = new Error("Contest name is required");
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }
  }

  private async publish(context: ContestTenantContext, type: EnterpriseEvent["type"], payload: Record<string, unknown>): Promise<void> {
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

  private async recordAudit(
    context: ContestTenantContext,
    action: "create" | "update",
    entityType: string,
    entityId: string,
    previousValue: unknown,
    newValue: unknown,
  ): Promise<void> {
    await this.audit?.record({
      organizationId: context.organizationId,
      actorUserId: context.actorUserId,
      action,
      entityType,
      entityId,
      previousValue,
      newValue,
    });
  }
}
