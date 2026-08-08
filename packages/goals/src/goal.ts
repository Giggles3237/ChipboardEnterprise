export type GoalScope = "individual" | "team";

export type Goal = {
  id?: string;
  organizationId: string;
  storeId?: string;
  advisorName: string;
  month: string;
  goalCount: number;
  scope: GoalScope;
  updatedAt?: string;
};

export type GoalInput = {
  advisorName: string;
  month: string;
  goalCount: number;
  scope?: GoalScope;
};

export type GoalTenantContext = {
  organizationId: string;
  actorUserId?: string;
  actorName?: string;
  role?: string;
  correlationId?: string;
};

export type GoalMutationResult = {
  goal: Goal;
  previousGoal?: Goal;
};

export type GoalsRepository = {
  getAdvisorGoal(context: GoalTenantContext, advisorName: string, month: string): Promise<Goal | null>;
  listMonthGoals(context: GoalTenantContext, month: string): Promise<Goal[]>;
  getStoredTeamGoal(context: GoalTenantContext, month: string): Promise<Goal | null>;
  getCalculatedTeamGoal(context: GoalTenantContext, month: string): Promise<number>;
  upsertGoal(context: GoalTenantContext, input: GoalInput): Promise<GoalMutationResult>;
};
