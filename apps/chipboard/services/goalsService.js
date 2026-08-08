class GoalsService {
  constructor({ repository, events, audit }) {
    this.repository = repository;
    this.events = events;
    this.audit = audit;
  }

  async getAdvisorGoal(context, advisorName, month) {
    this.assertTenantContext(context);
    return this.repository.getAdvisorGoal(context, advisorName, month);
  }

  async listMonthGoals(context, month) {
    this.assertTenantContext(context);
    return this.repository.listMonthGoals(context, month);
  }

  async getStoredTeamGoal(context, month) {
    this.assertTenantContext(context);
    return this.repository.getStoredTeamGoal(context, month);
  }

  async getCalculatedTeamGoal(context, month) {
    this.assertTenantContext(context);
    return this.repository.getCalculatedTeamGoal(context, month);
  }

  async upsertGoal(context, input) {
    this.assertTenantContext(context);
    this.assertGoalInput(input);

    const result = await this.repository.upsertGoal(context, input);
    const eventType = result.previousGoal ? 'goal.updated' : 'goal.created';

    await this.publish(context, eventType, {
      goal: result.goal,
      previousGoal: result.previousGoal
    });
    await this.publish(context, 'leaderboard.recalculated', {
      reason: eventType,
      month: result.goal.month
    });
    await this.recordAudit(
      context,
      result.previousGoal ? 'update' : 'create',
      result.goal.id,
      result.previousGoal,
      result.goal
    );

    return result.goal;
  }

  assertTenantContext(context) {
    if (!context.organizationId) {
      const error = new Error('Organization access required');
      error.statusCode = 403;
      throw error;
    }
  }

  assertGoalInput(input) {
    if (!input.advisorName || !input.month || input.goalCount === undefined) {
      const error = new Error('Missing required fields');
      error.statusCode = 400;
      throw error;
    }

    if (!Number.isFinite(Number(input.goalCount)) || Number(input.goalCount) < 0) {
      const error = new Error('Goal count must be a non-negative number');
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

  async recordAudit(context, action, entityId, previousValue, newValue) {
    await this.audit?.record({
      organizationId: context.organizationId,
      actorUserId: context.actorUserId,
      action,
      entityType: 'goal',
      entityId,
      previousValue,
      newValue
    });
  }
}

module.exports = {
  GoalsService
};
