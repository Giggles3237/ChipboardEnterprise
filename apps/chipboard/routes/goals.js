const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { oldPool } = require('../db');
const { CompositeGoalsEventPublisher, MysqlGoalsAuditLogger, MysqlGoalsEventOutboxPublisher } = require('../services/goalsEvents');
const { MysqlGoalsRepository, TEAM_ADVISOR } = require('../services/goalsRepository');
const { GoalsService } = require('../services/goalsService');

const goalsService = new GoalsService({
  repository: new MysqlGoalsRepository(oldPool),
  events: new CompositeGoalsEventPublisher([
    new MysqlGoalsEventOutboxPublisher(oldPool)
  ]),
  audit: new MysqlGoalsAuditLogger(oldPool)
});

const getTenantContext = (req, res) => {
  const organizationId = req.auth?.organizationId;

  if (!organizationId) {
    res.status(403).json({ message: 'Organization access required' });
    return null;
  }

  return {
    organizationId,
    actorUserId: req.auth.userId,
    actorName: req.auth.name,
    role: req.auth.role
  };
};

const toLegacyGoal = (goal) => ({
  advisor_name: goal.advisorName,
  month: goal.month,
  goal_count: goal.goalCount,
  organization_id: goal.organizationId,
  updated_at: goal.updatedAt
});

const handleGoalsError = (res, error, fallbackMessage) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(fallbackMessage, {
    message: error.message,
    code: error.code,
    sqlMessage: error.sqlMessage,
    sql: error.sql
  });

  return res.status(500).json({
    message: fallbackMessage,
    details: error.sqlMessage || error.message
  });
};

router.get('/team/test/:month', authenticate, async (req, res) => {
  try {
    const context = getTenantContext(req, res);
    if (!context) return;

    const goal = await goalsService.getStoredTeamGoal(context, req.params.month);
    res.json({
      rawResults: goal ? [toLegacyGoal(goal)] : [],
      parsedGoal: goal ? {
        goal_count: goal.goalCount,
        month: goal.month,
        updated_at: goal.updatedAt
      } : null
    });
  } catch (error) {
    handleGoalsError(res, error, 'Error fetching team goal test data');
  }
});

router.get('/team-goal/:month', authenticate, async (req, res) => {
  try {
    const context = getTenantContext(req, res);
    if (!context) return;

    const teamGoal = await goalsService.getCalculatedTeamGoal(context, req.params.month);
    res.json({ goal_count: teamGoal });
  } catch (error) {
    handleGoalsError(res, error, 'Error fetching team goal');
  }
});

router.get('/team/:month', authenticate, async (req, res) => {
  try {
    const context = getTenantContext(req, res);
    if (!context) return;

    const goal = await goalsService.getStoredTeamGoal(context, req.params.month);
    res.json({ goal_count: goal?.goalCount || 0 });
  } catch (error) {
    handleGoalsError(res, error, 'Error fetching team target');
  }
});

router.post('/team', authenticate, async (req, res) => {
  try {
    const context = getTenantContext(req, res);
    if (!context) return;

    const { month, goal_count } = req.body;
    const goal = await goalsService.upsertGoal(context, {
      advisorName: TEAM_ADVISOR,
      month,
      goalCount: Number(goal_count),
      scope: 'team'
    });

    res.json({
      message: 'Team goal saved successfully',
      goal: { month: goal.month, goal_count: goal.goalCount }
    });
  } catch (error) {
    handleGoalsError(res, error, 'Error saving team goal');
  }
});

router.get('/month/:month', authenticate, async (req, res) => {
  try {
    const context = getTenantContext(req, res);
    if (!context) return;

    const goals = await goalsService.listMonthGoals(context, req.params.month);
    res.json(goals.map(goal => ({
      advisor_name: goal.advisorName,
      goal_count: goal.goalCount
    })));
  } catch (error) {
    handleGoalsError(res, error, 'Error fetching goals');
  }
});

router.get('/:advisor/:month', authenticate, async (req, res) => {
  try {
    const context = getTenantContext(req, res);
    if (!context) return;

    const { advisor, month } = req.params;
    const goal = await goalsService.getAdvisorGoal(context, advisor, month);
    res.json(goal ? { goal_count: goal.goalCount } : { goal_count: 0 });
  } catch (error) {
    handleGoalsError(res, error, 'Error fetching goal');
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const context = getTenantContext(req, res);
    if (!context) return;

    const { advisor, month, goal_count } = req.body;

    if (context.role !== 'Admin' && context.actorName !== advisor) {
      return res.status(403).json({ message: 'Unauthorized to set this goal' });
    }

    const goal = await goalsService.upsertGoal(context, {
      advisorName: advisor,
      month,
      goalCount: Number(goal_count),
      scope: 'individual'
    });

    res.json({
      message: 'Goal saved successfully',
      goal: {
        advisor: goal.advisorName,
        month: goal.month,
        goal_count: goal.goalCount
      }
    });
  } catch (error) {
    handleGoalsError(res, error, 'Error saving goal');
  }
});

module.exports = router;
