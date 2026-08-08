export type ContestStatus = "draft" | "active" | "closed";

export type ContestTenantContext = {
  organizationId: string;
  actorUserId?: string;
  actorName?: string;
  role?: string;
  correlationId?: string;
};

export type ContestCategory = {
  id?: string;
  contestId: string;
  name: string;
  pointValue: number;
  targetPoints?: number | null;
  saleTypeMatch?: string | null;
  isRewards: boolean;
  sortOrder: number;
};

export type Contest = {
  id: string;
  organizationId: string;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  targetPoints: number;
  brandingLogo?: string | null;
  isEnabled: boolean;
  status: ContestStatus;
  categories?: ContestCategory[];
};

export type ContestSetupInput = {
  contest: {
    name: string;
    startDate?: string | null;
    endDate?: string | null;
    targetPoints?: number;
    brandingLogo?: string | null;
    isEnabled?: boolean;
    status?: ContestStatus;
  };
  categories?: Array<Partial<ContestCategory> & { id?: string; name: string }>;
};

export type ContestDealScore = {
  id?: string;
  contestId: string;
  saleId: string;
  advisor: string;
  categoryId?: string | null;
  countToward: boolean;
  rewardsCompleted: boolean;
  status: "pending" | "published";
  basePoints: number;
  rewardsPoints: number;
};

export type ContestDealScoreInput = {
  advisor: string;
  categoryId?: string | null;
  countToward?: boolean;
  rewardsCompleted?: boolean;
  basePoints?: number;
  rewardsPoints?: number;
};

export type ContestBonus = {
  id?: string;
  contestId: string;
  advisor: string;
  reason: string;
  points: number;
  status: "published";
};

export type ContestBonusInput = {
  advisor: string;
  reason: string;
  points: number;
};

export type ContestRepository = {
  updateSetup(context: ContestTenantContext, contestId: string, input: ContestSetupInput): Promise<{ contest: Contest; previousContest?: Contest }>;
  scoreDeal(context: ContestTenantContext, contestId: string, saleId: string, input: ContestDealScoreInput): Promise<{ score: ContestDealScore; previousScore?: ContestDealScore }>;
  publishPendingScores(context: ContestTenantContext, contestId: string): Promise<{ contest: Contest; previousContest?: Contest; publishedCount: number }>;
  addBonus(context: ContestTenantContext, contestId: string, input: ContestBonusInput): Promise<{ bonus: ContestBonus }>;
  closeContest(context: ContestTenantContext, contestId: string): Promise<{ contest: Contest; previousContest?: Contest }>;
};
