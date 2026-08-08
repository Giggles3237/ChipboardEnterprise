const { MysqlContestsRepository } = require('./contestsRepository');
const {
  CompositeContestsEventPublisher,
  MysqlContestsAuditLogger,
  MysqlContestsEventOutboxPublisher
} = require('./contestsEvents');

class ContestsService {
  constructor({ repository, events, audit }) {
    this.repository = repository;
    this.events = events;
    this.audit = audit;
  }

  async updateSetup(context, contestId, input) {
    this.assertTenantContext(context);
    this.assertContestId(contestId);
    this.assertSetupInput(input);

    const result = await this.repository.updateSetup(context, contestId, input);
    await this.publish(context, 'contest.updated', result);
    await this.recordAudit(context, 'update', 'contest', contestId, result.previousContest, result.contest);
    return result.contest;
  }

  async scoreDeal(context, contestId, saleId, input) {
    this.assertTenantContext(context);
    this.assertContestId(contestId);
    if (!saleId) {
      const error = new Error('Sale id is required');
      error.statusCode = 400;
      throw error;
    }

    const result = await this.repository.scoreDeal(context, contestId, saleId, input);
    await this.publish(context, 'contest.score.updated', {
      contestId,
      saleId,
      score: result.score,
      previousScore: result.previousScore
    });
    await this.publish(context, 'leaderboard.recalculated', { reason: 'contest.score.updated', contestId });
    await this.recordAudit(context, result.previousScore ? 'update' : 'create', 'contest_deal_score', saleId, result.previousScore, result.score);
  }

  async publishPendingScores(context, contestId) {
    this.assertTenantContext(context);
    this.assertContestId(contestId);

    const result = await this.repository.publishPendingScores(context, contestId);
    await this.publish(context, 'contest.published', result);
    await this.publish(context, 'leaderboard.recalculated', { reason: 'contest.published', contestId });
    await this.recordAudit(context, 'update', 'contest', contestId, result.previousContest, result.contest);
    return result.contest;
  }

  async addBonus(context, contestId, input) {
    this.assertTenantContext(context);
    this.assertContestId(contestId);

    if (!input.advisor || !input.reason || !Number(input.points)) {
      const error = new Error('Advisor, reason, and points are required');
      error.statusCode = 400;
      throw error;
    }

    const result = await this.repository.addBonus(context, contestId, input);
    await this.publish(context, 'reward.awarded', { contestId, bonus: result.bonus });
    await this.publish(context, 'leaderboard.recalculated', { reason: 'reward.awarded', contestId });
    await this.recordAudit(context, 'create', 'contest_bonus', result.bonus?.id || contestId, undefined, result.bonus);
  }

  async closeContest(context, contestId) {
    this.assertTenantContext(context);
    this.assertContestId(contestId);

    const result = await this.repository.closeContest(context, contestId);
    await this.publish(context, 'contest.closed', result);
    await this.recordAudit(context, 'update', 'contest', contestId, result.previousContest, result.contest);
    return result.contest;
  }

  assertTenantContext(context) {
    if (!context.organizationId) {
      const error = new Error('Organization access required');
      error.statusCode = 403;
      throw error;
    }
  }

  assertContestId(contestId) {
    if (!contestId) {
      const error = new Error('Contest id is required');
      error.statusCode = 400;
      throw error;
    }
  }

  assertSetupInput(input) {
    if (!input.contest?.name) {
      const error = new Error('Contest name is required');
      error.statusCode = 400;
      throw error;
    }
  }

  async publish(context, type, payload) {
    await this.events?.publish({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      organizationId: context.organizationId,
      type,
      payload,
      actorUserId: context.actorUserId,
      occurredAt: new Date().toISOString(),
      correlationId: context.correlationId
    });
  }

  async recordAudit(context, action, entityType, entityId, previousValue, newValue) {
    await this.audit?.record({
      organizationId: context.organizationId,
      actorUserId: context.actorUserId,
      action,
      entityType,
      entityId,
      previousValue,
      newValue
    });
  }
}

const createContestService = (pool) => new ContestsService({
  repository: new MysqlContestsRepository(pool),
  events: new CompositeContestsEventPublisher([
    new MysqlContestsEventOutboxPublisher(pool)
  ]),
  audit: new MysqlContestsAuditLogger(pool)
});

module.exports = {
  ContestsService,
  createContestService
};
