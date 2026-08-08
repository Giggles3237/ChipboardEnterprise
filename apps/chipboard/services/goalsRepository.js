const TEAM_ADVISOR = 'TEAM';

const toGoal = (row, organizationId) => ({
  id: row.id ? String(row.id) : `${row.advisor_name}:${row.month}`,
  organizationId: String(row.organization_id ?? organizationId),
  advisorName: row.advisor_name,
  month: row.month,
  goalCount: row.goal_count || 0,
  scope: row.advisor_name === TEAM_ADVISOR ? 'team' : 'individual',
  updatedAt: row.updated_at
});

class MysqlGoalsRepository {
  constructor(pool) {
    this.pool = pool;
    this.ready = null;
  }

  async getAdvisorGoal(context, advisorName, month) {
    await this.ensureTenantColumn();
    const [results] = await this.pool.query(
      `SELECT * FROM monthly_goals
       WHERE advisor_name = ? AND month = ?
       AND (organization_id = ? OR organization_id IS NULL)
       ORDER BY organization_id IS NULL ASC
       LIMIT 1`,
      [advisorName, month, context.organizationId]
    );

    return results[0] ? toGoal(results[0], context.organizationId) : null;
  }

  async listMonthGoals(context, month) {
    await this.ensureTenantColumn();
    const [results] = await this.pool.query(
      `SELECT advisor_name, month, goal_count, organization_id, updated_at
       FROM monthly_goals
       WHERE month = ?
       AND (organization_id = ? OR organization_id IS NULL)`,
      [month, context.organizationId]
    );

    return results.map(row => toGoal(row, context.organizationId));
  }

  async getStoredTeamGoal(context, month) {
    return this.getAdvisorGoal(context, TEAM_ADVISOR, month);
  }

  async getCalculatedTeamGoal(context, month) {
    await this.ensureTenantColumn();
    const [results] = await this.pool.query(
      `SELECT goal_count FROM monthly_goals
       WHERE month = ?
       AND advisor_name != ?
       AND (organization_id = ? OR organization_id IS NULL)`,
      [month, TEAM_ADVISOR, context.organizationId]
    );

    return results.reduce((sum, goal) => sum + (goal.goal_count || 0), 0);
  }

  async upsertGoal(context, input) {
    await this.ensureTenantColumn();

    const advisorName = input.scope === 'team' ? TEAM_ADVISOR : input.advisorName;
    const previousGoal = await this.getAdvisorGoal(context, advisorName, input.month);

    const [result] = await this.pool.query(
      `INSERT INTO monthly_goals (advisor_name, month, goal_count, organization_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE goal_count = ?, organization_id = ?`,
      [
        advisorName,
        input.month,
        input.goalCount,
        context.organizationId,
        input.goalCount,
        context.organizationId
      ]
    );

    return {
      previousGoal,
      goal: {
        id: previousGoal?.id || String(result.insertId || `${advisorName}:${input.month}`),
        organizationId: String(context.organizationId),
        advisorName,
        month: input.month,
        goalCount: input.goalCount,
        scope: advisorName === TEAM_ADVISOR ? 'team' : 'individual'
      }
    };
  }

  ensureTenantColumn() {
    if (!this.ready) {
      this.ready = (async () => {
        const [columns] = await this.pool.query(
          `SELECT COLUMN_NAME
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'monthly_goals'
           AND COLUMN_NAME = 'organization_id'`
        );

        if (columns.length === 0) {
          await this.pool.query('ALTER TABLE monthly_goals ADD COLUMN organization_id INT NULL');
          await this.pool.query('CREATE INDEX idx_monthly_goals_organization_month ON monthly_goals (organization_id, month)');
        }
      })();
    }

    return this.ready;
  }
}

module.exports = {
  MysqlGoalsRepository,
  TEAM_ADVISOR
};
