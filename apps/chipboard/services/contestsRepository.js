const mapContest = (row, categories = []) => row && ({
  id: String(row.id),
  organizationId: String(row.organization_id),
  name: row.name,
  startDate: row.start_date,
  endDate: row.end_date,
  targetPoints: Number(row.target_points || 0),
  brandingLogo: row.branding_logo || null,
  isEnabled: Boolean(row.is_enabled),
  status: row.status || 'active',
  categories
});

const mapCategory = row => ({
  id: String(row.id),
  contestId: String(row.contest_id),
  name: row.name,
  pointValue: Number(row.point_value || 0),
  targetPoints: row.target_points === null || row.target_points === undefined ? null : Number(row.target_points),
  saleTypeMatch: row.sale_type_match || null,
  isRewards: Boolean(row.is_rewards),
  sortOrder: Number(row.sort_order || 0)
});

const mapScore = row => row && ({
  id: row.id ? String(row.id) : undefined,
  contestId: String(row.contest_id),
  saleId: String(row.sale_id),
  advisor: row.advisor,
  categoryId: row.category_id === null || row.category_id === undefined ? null : String(row.category_id),
  countToward: Boolean(row.count_toward),
  rewardsCompleted: Boolean(row.rewards_completed),
  status: row.status || 'pending',
  basePoints: Number(row.base_points || 0),
  rewardsPoints: Number(row.rewards_points || 0)
});

const mapBonus = row => row && ({
  id: String(row.id),
  contestId: String(row.contest_id),
  advisor: row.advisor,
  reason: row.reason,
  points: Number(row.points || 0),
  status: row.status || 'published'
});

class MysqlContestsRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async updateSetup(context, contestId, input) {
    const previousContest = await this.loadContest(contestId);
    const contest = input.contest;

    await this.pool.query(`
      UPDATE contests
      SET name = ?, start_date = ?, end_date = ?, target_points = ?, branding_logo = ?, is_enabled = ?, status = ?
      WHERE id = ? AND organization_id = ?
    `, [
      contest.name,
      contest.startDate ?? contest.start_date ?? null,
      contest.endDate ?? contest.end_date ?? null,
      Number(contest.targetPoints ?? contest.target_points ?? 0),
      contest.brandingLogo ?? contest.branding_logo ?? null,
      contest.isEnabled ?? contest.is_enabled ? 1 : 0,
      contest.status || 'active',
      contestId,
      context.organizationId
    ]);

    if (Array.isArray(input.categories)) {
      for (const [index, category] of input.categories.entries()) {
        if (category.id) {
          await this.pool.query(`
            UPDATE contest_categories
            SET name = ?, point_value = ?, target_points = ?, sale_type_match = ?, is_rewards = ?, sort_order = ?
            WHERE id = ? AND contest_id = ?
          `, [
            category.name,
            Number(category.pointValue ?? category.point_value ?? 0),
            category.targetPoints ?? category.target_points ?? null,
            category.saleTypeMatch ?? category.sale_type_match ?? category.name,
            category.isRewards ?? category.is_rewards ? 1 : 0,
            index + 1,
            category.id,
            contestId
          ]);
        } else {
          await this.pool.query(`
            INSERT INTO contest_categories
              (contest_id, name, point_value, target_points, sale_type_match, is_rewards, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            contestId,
            category.name,
            Number(category.pointValue ?? category.point_value ?? 0),
            category.targetPoints ?? category.target_points ?? null,
            category.saleTypeMatch ?? category.sale_type_match ?? category.name,
            category.isRewards ?? category.is_rewards ? 1 : 0,
            index + 1
          ]);
        }
      }
    }

    return {
      previousContest,
      contest: await this.loadContest(contestId)
    };
  }

  async scoreDeal(context, contestId, saleId, input) {
    const previousScore = await this.loadScore(contestId, saleId);

    await this.pool.query(`
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
      input.advisor,
      input.categoryId ?? input.category_id ?? null,
      input.countToward ?? input.count_toward ? 1 : 0,
      input.rewardsCompleted ?? input.rewards_completed ? 1 : 0,
      Number(input.basePoints ?? input.base_points ?? 0),
      Number(input.rewardsPoints ?? input.rewards_points ?? 0),
      context.actorUserId
    ]);

    return {
      previousScore,
      score: await this.loadScore(contestId, saleId)
    };
  }

  async publishPendingScores(context, contestId) {
    const previousContest = await this.loadContest(contestId);
    const [publishResult] = await this.pool.query(`
      UPDATE contest_deal_scores
      SET status = 'published', published_by = ?, published_at = NOW()
      WHERE contest_id = ? AND status = 'pending' AND (count_toward = 1 OR rewards_completed = 1)
    `, [context.actorUserId, contestId]);

    await this.pool.query(`
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

    return {
      previousContest,
      contest: await this.loadContest(contestId),
      publishedCount: Number(publishResult.affectedRows || 0)
    };
  }

  async addBonus(context, contestId, input) {
    const [result] = await this.pool.query(`
      INSERT INTO contest_bonuses
        (contest_id, advisor, reason, points, status, awarded_by, published_at)
      VALUES (?, ?, ?, ?, 'published', ?, NOW())
    `, [contestId, input.advisor, input.reason, Number(input.points), context.actorUserId]);

    const [[row]] = await this.pool.query('SELECT * FROM contest_bonuses WHERE id = ?', [result.insertId]);
    return { bonus: mapBonus(row) };
  }

  async closeContest(context, contestId) {
    const previousContest = await this.loadContest(contestId);
    await this.pool.query('UPDATE contests SET status = ? WHERE id = ? AND organization_id = ?', ['closed', contestId, context.organizationId]);
    return {
      previousContest,
      contest: await this.loadContest(contestId)
    };
  }

  async loadContest(contestId) {
    const [[contest]] = await this.pool.query('SELECT * FROM contests WHERE id = ?', [contestId]);
    if (!contest) return null;

    const [categories] = await this.pool.query(`
      SELECT *
      FROM contest_categories
      WHERE contest_id = ?
      ORDER BY sort_order, id
    `, [contestId]);

    return mapContest(contest, categories.map(mapCategory));
  }

  async loadScore(contestId, saleId) {
    const [[score]] = await this.pool.query(
      'SELECT * FROM contest_deal_scores WHERE contest_id = ? AND sale_id = ?',
      [contestId, saleId]
    );
    return mapScore(score);
  }
}

module.exports = {
  MysqlContestsRepository
};
