export type LeaderboardEntry = {
  organizationId: string;
  storeId?: string;
  advisorName: string;
  month: string;
  deliveredCount: number;
  pendingCount: number;
  goalCount: number;
  pacePercent: number;
};

export type LeaderboardSale = {
  advisor?: string;
  delivered?: boolean | number;
};

export type LeaderboardGoal = {
  advisorName: string;
  goalCount: number;
};

export function buildMonthlyLeaderboard(input: {
  organizationId: string;
  month: string;
  sales: LeaderboardSale[];
  goals: LeaderboardGoal[];
}): LeaderboardEntry[] {
  const goalsByAdvisor = new Map(input.goals.map((goal) => [goal.advisorName, goal.goalCount]));
  const entries = new Map<string, LeaderboardEntry>();

  for (const goal of input.goals) {
    entries.set(goal.advisorName, {
      organizationId: input.organizationId,
      advisorName: goal.advisorName,
      month: input.month,
      deliveredCount: 0,
      pendingCount: 0,
      goalCount: goal.goalCount,
      pacePercent: 0,
    });
  }

  for (const sale of input.sales) {
    if (!sale.advisor) continue;

    const current = entries.get(sale.advisor) ?? {
      organizationId: input.organizationId,
      advisorName: sale.advisor,
      month: input.month,
      deliveredCount: 0,
      pendingCount: 0,
      goalCount: goalsByAdvisor.get(sale.advisor) ?? 0,
      pacePercent: 0,
    };

    if (sale.delivered === true || sale.delivered === 1) {
      current.deliveredCount += 1;
    } else {
      current.pendingCount += 1;
    }

    current.pacePercent = current.goalCount > 0 ? Math.round((current.deliveredCount / current.goalCount) * 100) : 0;
    entries.set(sale.advisor, current);
  }

  return [...entries.values()].sort((left, right) => right.deliveredCount - left.deliveredCount);
}
