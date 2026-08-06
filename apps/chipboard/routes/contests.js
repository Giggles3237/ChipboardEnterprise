const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { oldPool } = require('../db');

const managerRoles = ['Admin', 'Manager'];

const isAdmin = (req) => req.auth?.role === 'Admin';

const isManager = (req) => managerRoles.includes(req.auth?.role);

const requireManager = (req, res, next) => {
  if (!isManager(req)) {
    return res.status(403).json({ message: 'Permission denied' });
  }
  next();
};

const requireEnabledContest = async (req, res, next) => {
  try {
    await ensureSchema();
    const [[contest]] = await oldPool.query(
      'SELECT is_enabled FROM contests WHERE id = ?',
      [req.params.contestId]
    );

    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    if (!contest.is_enabled) {
      return res.status(409).json({ message: 'Mission 250 is currently turned off' });
    }
    next();
  } catch (error) {
    console.error('Error checking contest availability:', error);
    res.status(500).json({ message: 'Error checking contest availability', error: error.message });
  }
};

let schemaReady = false;
let schemaReadyPromise = null;

const ensureColumn = async (tableName, columnName, definition) => {
  const [columns] = await oldPool.query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `, [tableName, columnName]);

  if (!columns.length) {
    await oldPool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const ensureSchema = async () => {
  if (schemaReady) return;

  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {

      await oldPool.query(`
    CREATE TABLE IF NOT EXISTS contests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT NULL,
      name VARCHAR(120) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      target_points INT NOT NULL DEFAULT 0,
      branding_logo VARCHAR(255) NULL,
      is_enabled TINYINT(1) NOT NULL DEFAULT 0,
      status ENUM('draft', 'active', 'closed') NOT NULL DEFAULT 'active',
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_contests_status_dates (status, start_date, end_date),
      INDEX idx_contests_organization (organization_id)
    )
  `);

  await ensureColumn('contests', 'is_enabled', 'TINYINT(1) NOT NULL DEFAULT 0');

  await oldPool.query(`
    CREATE TABLE IF NOT EXISTS contest_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      contest_id INT NOT NULL,
      name VARCHAR(80) NOT NULL,
      point_value INT NOT NULL DEFAULT 0,
      target_points INT NULL,
      sale_type_match VARCHAR(80) NULL,
      is_rewards TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
      INDEX idx_contest_categories_contest (contest_id)
    )
  `);

  await ensureColumn('contest_categories', 'target_points', 'INT NULL');

  await oldPool.query(`
    CREATE TABLE IF NOT EXISTS contest_deal_scores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      contest_id INT NOT NULL,
      sale_id INT NOT NULL,
      advisor VARCHAR(120) NOT NULL,
      category_id INT NULL,
      count_toward TINYINT(1) NOT NULL DEFAULT 0,
      rewards_completed TINYINT(1) NOT NULL DEFAULT 0,
      status ENUM('pending', 'published') NOT NULL DEFAULT 'pending',
      base_points INT NOT NULL DEFAULT 0,
      rewards_points INT NOT NULL DEFAULT 0,
      reviewed_by INT NULL,
      published_by INT NULL,
      published_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_contest_sale (contest_id, sale_id),
      FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES contest_categories(id) ON DELETE SET NULL,
      INDEX idx_contest_deal_scores_status (contest_id, status)
    )
  `);

  await oldPool.query(`
    CREATE TABLE IF NOT EXISTS contest_bonuses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      contest_id INT NOT NULL,
      advisor VARCHAR(120) NOT NULL,
      reason VARCHAR(255) NOT NULL,
      points INT NOT NULL,
      status ENUM('pending', 'published') NOT NULL DEFAULT 'published',
      awarded_by INT NULL,
      published_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
      INDEX idx_contest_bonuses_contest (contest_id, status)
    )
  `);

      schemaReady = true;
    })();
  }

  try {
    await schemaReadyPromise;
  } catch (error) {
    schemaReadyPromise = null;
    throw error;
  }
};

const toDateOnly = (value) => {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const inferCategory = (sale, categories) => {
  const searchable = [sale.type, sale.make, sale.model].map(normalize).join(' ');
  const nonRewards = categories.filter((category) => !category.is_rewards);

  const exactMatch = nonRewards.find((category) => {
    const matcher = normalize(category.sale_type_match || category.name);
    return matcher && normalize(sale.type) === matcher;
  });
  if (exactMatch) return exactMatch;

  return nonRewards.find((category) => {
    const matcher = normalize(category.sale_type_match || category.name);
    return matcher && searchable.includes(matcher);
  }) || null;
};

const getRewardsCategory = (categories) => categories.find((category) => category.is_rewards);

const serializeCategory = (category) => ({
  ...category,
  point_value: Number(category.point_value || 0),
  target_points: category.target_points === null || category.target_points === undefined ? null : Number(category.target_points || 0),
  is_rewards: Boolean(category.is_rewards)
});

const getCurrentContest = async (organizationId) => {
  const params = [];
  let orgFilter = 'AND organization_id IS NULL';

  if (organizationId) {
    orgFilter = 'AND (organization_id = ? OR organization_id IS NULL)';
    params.push(organizationId);
  }

  const [rows] = await oldPool.query(`
    SELECT *
    FROM contests
    WHERE 1 = 1
    ${orgFilter}
    ORDER BY organization_id IS NULL ASC, id DESC
    LIMIT 1
  `, params);

  if (rows.length) return rows[0];

  const contestId = await seedMission250(organizationId);
  const [[contest]] = await oldPool.query('SELECT * FROM contests WHERE id = ?', [contestId]);
  return contest;
};

const seedMission250 = async (organizationId) => {
  const year = new Date().getFullYear();
  const [result] = await oldPool.query(`
    INSERT INTO contests (organization_id, name, start_date, end_date, target_points, is_enabled, status)
    VALUES (?, 'Mission 250', ?, ?, 250, 0, 'active')
  `, [organizationId || null, `${year}-07-01`, `${year}-07-31`]);

  const contestId = result.insertId;
  const categories = [
    ['BMW New', 1, 46, 'BMW New', 0, 1],
    ['Used', 2, 45, 'Used', 0, 2],
    ['MINI', 3, 18, 'MINI', 0, 3],
    ['Rewards', 5, 12, 'Rewards', 1, 4]
  ];

  await oldPool.query(`
    INSERT INTO contest_categories
      (contest_id, name, point_value, target_points, sale_type_match, is_rewards, sort_order)
    VALUES ?
  `, [categories.map((category) => [contestId, ...category])]);

  return contestId;
};

const loadContestBundle = async (contestId, req) => {
  const [[contest]] = await oldPool.query('SELECT * FROM contests WHERE id = ?', [contestId]);
  if (!contest) return null;

  const [categoryRows] = await oldPool.query(`
    SELECT *
    FROM contest_categories
    WHERE contest_id = ?
    ORDER BY sort_order ASC, id ASC
  `, [contestId]);
  const categories = categoryRows.map(serializeCategory);
  const rewardsCategory = getRewardsCategory(categories);

  const [sales] = await oldPool.query(`
    SELECT *
    FROM vehicle_sales
    WHERE deliveryDate BETWEEN ? AND ?
    ORDER BY deliveryDate ASC, advisor ASC, id ASC
  `, [toDateOnly(contest.start_date), toDateOnly(contest.end_date)]);

  const [scores] = await oldPool.query(`
    SELECT *
    FROM contest_deal_scores
    WHERE contest_id = ?
  `, [contestId]);

  const scoreBySaleId = new Map(scores.map((score) => [Number(score.sale_id), score]));
  const deals = sales.map((sale) => {
    const score = scoreBySaleId.get(Number(sale.id));
    const inferredCategory = inferCategory(sale, categories);
    const selectedCategory = categories.find((category) => category.id === score?.category_id) || inferredCategory;
    const basePoints = score ? Number(score.base_points || 0) : Number(selectedCategory?.point_value || 0);
    const rewardsPoints = score
      ? Number(score.rewards_points || 0)
      : Number(rewardsCategory?.point_value || 0);
    const totalPoints = score
      ? (Number(score.count_toward) ? basePoints : 0) + (Number(score.rewards_completed) ? rewardsPoints : 0)
      : 0;

    return {
      saleId: sale.id,
      stockNumber: sale.stockNumber,
      clientName: sale.clientName,
      advisor: sale.advisor,
      vehicle: [sale.year, sale.make, sale.model].filter(Boolean).join(' '),
      type: sale.type,
      delivered: sale.deliveryDate,
      categoryId: selectedCategory?.id || null,
      inferredCategoryId: inferredCategory?.id || null,
      countToward: Boolean(score?.count_toward),
      rewardsCompleted: Boolean(score?.rewards_completed),
      status: score?.status || 'pending',
      basePoints,
      rewardsPoints,
      points: totalPoints
    };
  });

  const [bonusRows] = await oldPool.query(`
    SELECT *
    FROM contest_bonuses
    WHERE contest_id = ?
    ORDER BY created_at DESC
  `, [contestId]);

  const publishedDeals = deals.filter((deal) => deal.status === 'published');
  const publishedBonuses = bonusRows.filter((bonus) => bonus.status === 'published');
  const advisorTotals = new Map();
  const categoryTotals = new Map(categories.map((category) => [category.id, 0]));

  const addAdvisorPoints = (advisor, field, points) => {
    if (!advisorTotals.has(advisor)) {
      advisorTotals.set(advisor, {
        advisor,
        points: 0,
        bmw: 0,
        used: 0,
        mini: 0,
        rewards: 0,
        bonus: 0
      });
    }
    const row = advisorTotals.get(advisor);
    row.points += points;
    row[field] += points;
  };

  publishedDeals.forEach((deal) => {
    const category = categories.find((item) => item.id === deal.categoryId);
    if (deal.countToward && category) {
      const key = normalize(category.name).includes('mini')
        ? 'mini'
        : normalize(category.name).includes('used')
          ? 'used'
          : 'bmw';
      addAdvisorPoints(deal.advisor, key, deal.basePoints);
      categoryTotals.set(category.id, (categoryTotals.get(category.id) || 0) + deal.basePoints);
    }

    if (deal.rewardsCompleted && rewardsCategory) {
      addAdvisorPoints(deal.advisor, 'rewards', deal.rewardsPoints);
      categoryTotals.set(rewardsCategory.id, (categoryTotals.get(rewardsCategory.id) || 0) + deal.rewardsPoints);
    }
  });

  publishedBonuses.forEach((bonus) => {
    addAdvisorPoints(bonus.advisor, 'bonus', Number(bonus.points || 0));
  });

  const leaderboard = Array.from(advisorTotals.values()).sort((a, b) => b.points - a.points || a.advisor.localeCompare(b.advisor));
  const currentPoints = leaderboard.reduce((sum, row) => sum + row.points, 0);

  const dealActivity = publishedDeals.flatMap((deal) => {
    const events = [];
    if (deal.countToward && deal.basePoints) {
      events.push({
        type: 'deal',
        advisor: deal.advisor,
        points: deal.basePoints,
        description: `${deal.advisor} delivered ${deal.vehicle || deal.type || 'a vehicle'}`,
        createdAt: deal.delivered
      });
    }
    if (deal.rewardsCompleted && deal.rewardsPoints) {
      events.push({
        type: 'rewards',
        advisor: deal.advisor,
        points: deal.rewardsPoints,
        description: `${deal.advisor} completed Rewards`,
        createdAt: deal.delivered
      });
    }
    return events;
  });

  const bonusActivity = publishedBonuses.map((bonus) => ({
    type: 'bonus',
    advisor: bonus.advisor,
    points: Number(bonus.points || 0),
    description: `${bonus.advisor}: ${bonus.reason}`,
    createdAt: bonus.created_at
  }));

  const activity = [...dealActivity, ...bonusActivity]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20);

  const userAdvisor = req.auth?.name || req.auth?.email;

  return {
    contest: {
      ...contest,
      is_enabled: Boolean(contest.is_enabled),
      start_date: toDateOnly(contest.start_date),
      end_date: toDateOnly(contest.end_date),
      target_points: Number(contest.target_points || 0),
      current_points: currentPoints,
      is_complete: currentPoints >= Number(contest.target_points || 0)
    },
    categories,
    deals,
    bonuses: bonusRows,
    leaderboard,
    activity,
    categoryProgress: categories.map((category) => ({
      id: category.id,
      name: category.name,
      current: categoryTotals.get(category.id) || 0,
      target: category.target_points,
      pointValue: category.point_value,
      isRewards: category.is_rewards
    })),
    viewer: {
      isManager: isManager(req),
      advisor: userAdvisor
    }
  };
};

router.use(authenticate);

router.get('/status', async (req, res) => {
  try {
    await ensureSchema();
    const contest = await getCurrentContest(req.auth.organizationId);
    res.json({
      enabled: Boolean(contest?.is_enabled),
      name: contest?.name || 'Mission 250',
      canManage: isManager(req),
      canViewWhenDisabled: isAdmin(req)
    });
  } catch (error) {
    console.error('Error loading contest status:', error);
    res.status(500).json({ message: 'Error loading contest status', error: error.message });
  }
});

router.get('/active', async (req, res) => {
  try {
    await ensureSchema();
    const contest = await getCurrentContest(req.auth.organizationId);

    if (!contest?.is_enabled && !isAdmin(req)) {
      return res.status(404).json({
        message: 'Mission 250 is currently turned off',
        code: 'CONTEST_DISABLED'
      });
    }

    const bundle = await loadContestBundle(contest.id, req);
    res.json(bundle);
  } catch (error) {
    console.error('Error loading contest:', error);
    res.status(500).json({ message: 'Error loading contest', error: error.message });
  }
});

router.put('/:contestId/setup', requireManager, async (req, res) => {
  try {
    await ensureSchema();
    const { contest, categories } = req.body;
    const contestId = req.params.contestId;

    await oldPool.query(`
      UPDATE contests
      SET name = ?, start_date = ?, end_date = ?, target_points = ?, branding_logo = ?, is_enabled = ?, status = ?
      WHERE id = ?
    `, [
      contest.name,
      contest.start_date,
      contest.end_date,
      Number(contest.target_points || contest.targetPoints || 0),
      contest.branding_logo || contest.brandingLogo || null,
      contest.is_enabled || contest.isEnabled ? 1 : 0,
      contest.status || 'active',
      contestId
    ]);

    if (Array.isArray(categories)) {
      for (const [index, category] of categories.entries()) {
        if (category.id) {
          await oldPool.query(`
            UPDATE contest_categories
            SET name = ?, point_value = ?, target_points = ?, sale_type_match = ?, is_rewards = ?, sort_order = ?
            WHERE id = ? AND contest_id = ?
          `, [
            category.name,
            Number(category.point_value || category.pointValue || 0),
            category.target_points ?? category.targetPoints ?? null,
            category.sale_type_match || category.saleTypeMatch || category.name,
            category.is_rewards ? 1 : 0,
            index + 1,
            category.id,
            contestId
          ]);
        } else {
          await oldPool.query(`
            INSERT INTO contest_categories
              (contest_id, name, point_value, target_points, sale_type_match, is_rewards, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            contestId,
            category.name,
            Number(category.point_value || category.pointValue || 0),
            category.target_points ?? category.targetPoints ?? null,
            category.sale_type_match || category.saleTypeMatch || category.name,
            category.is_rewards ? 1 : 0,
            index + 1
          ]);
        }
      }
    }

    const bundle = await loadContestBundle(contestId, req);
    res.json(bundle);
  } catch (error) {
    console.error('Error saving contest setup:', error);
    res.status(500).json({ message: 'Error saving contest setup', error: error.message });
  }
});

router.post('/:contestId/deals/:saleId/score', requireManager, requireEnabledContest, async (req, res) => {
  try {
    await ensureSchema();
    const contestId = req.params.contestId;
    const saleId = req.params.saleId;
    const {
      advisor,
      categoryId,
      countToward,
      rewardsCompleted,
      basePoints,
      rewardsPoints
    } = req.body;

    await oldPool.query(`
      INSERT INTO contest_deal_scores
        (contest_id, sale_id, advisor, category_id, count_toward, rewards_completed, status, base_points, rewards_points, reviewed_by)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        advisor = VALUES(advisor),
        category_id = VALUES(category_id),
        count_toward = VALUES(count_toward),
        rewards_completed = VALUES(rewards_completed),
        status = IF(status = 'published', 'published', 'pending'),
        base_points = VALUES(base_points),
        rewards_points = VALUES(rewards_points),
        reviewed_by = VALUES(reviewed_by)
    `, [
      contestId,
      saleId,
      advisor,
      categoryId || null,
      countToward ? 1 : 0,
      rewardsCompleted ? 1 : 0,
      Number(basePoints || 0),
      Number(rewardsPoints || 0),
      req.auth.userId
    ]);

    const bundle = await loadContestBundle(contestId, req);
    res.json(bundle);
  } catch (error) {
    console.error('Error scoring contest deal:', error);
    res.status(500).json({ message: 'Error scoring contest deal', error: error.message });
  }
});

router.post('/:contestId/publish', requireManager, requireEnabledContest, async (req, res) => {
  try {
    await ensureSchema();
    const contestId = req.params.contestId;

    await oldPool.query(`
      UPDATE contest_deal_scores
      SET status = 'published', published_by = ?, published_at = NOW()
      WHERE contest_id = ? AND status = 'pending' AND (count_toward = 1 OR rewards_completed = 1)
    `, [req.auth.userId, contestId]);

    await oldPool.query(`
      UPDATE contests
      SET status = 'closed'
      WHERE id = ?
      AND target_points > 0
      AND target_points <= (
        SELECT total_points FROM (
          SELECT
            COALESCE(SUM(CASE WHEN count_toward = 1 THEN base_points ELSE 0 END), 0) +
            COALESCE(SUM(CASE WHEN rewards_completed = 1 THEN rewards_points ELSE 0 END), 0) +
            COALESCE((SELECT SUM(points) FROM contest_bonuses WHERE contest_id = ? AND status = 'published'), 0) AS total_points
          FROM contest_deal_scores
          WHERE contest_id = ? AND status = 'published'
        ) totals
      )
    `, [contestId, contestId, contestId]);

    const bundle = await loadContestBundle(contestId, req);
    res.json(bundle);
  } catch (error) {
    console.error('Error publishing contest scores:', error);
    res.status(500).json({ message: 'Error publishing contest scores', error: error.message });
  }
});

router.post('/:contestId/bonuses', requireManager, requireEnabledContest, async (req, res) => {
  try {
    await ensureSchema();
    const contestId = req.params.contestId;
    const { advisor, reason, points } = req.body;

    if (!advisor || !reason || !Number(points)) {
      return res.status(400).json({ message: 'Advisor, reason, and points are required' });
    }

    await oldPool.query(`
      INSERT INTO contest_bonuses
        (contest_id, advisor, reason, points, status, awarded_by, published_at)
      VALUES (?, ?, ?, ?, 'published', ?, NOW())
    `, [contestId, advisor, reason, Number(points), req.auth.userId]);

    const bundle = await loadContestBundle(contestId, req);
    res.json(bundle);
  } catch (error) {
    console.error('Error adding contest bonus:', error);
    res.status(500).json({ message: 'Error adding contest bonus', error: error.message });
  }
});

router.post('/:contestId/close', requireManager, requireEnabledContest, async (req, res) => {
  try {
    await ensureSchema();
    await oldPool.query('UPDATE contests SET status = ? WHERE id = ?', ['closed', req.params.contestId]);
    const bundle = await loadContestBundle(req.params.contestId, req);
    res.json(bundle);
  } catch (error) {
    console.error('Error closing contest:', error);
    res.status(500).json({ message: 'Error closing contest', error: error.message });
  }
});

module.exports = router;
