export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type TaskStatus = "OPEN" | "TODO" | "PENDING" | "COMPLETED" | "FAILED" | string;
export type HabitStatus = string;
export type QuestStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type QuestStepStatus = "PENDING" | "COMPLETED" | "SKIPPED";
export type DailyPlanStatus = "PLANNED" | "ACTIVE" | "CLOSED";
export type DailyPlanItemStatus = "PENDING" | "COMPLETED" | "FAILED";
export type SourceType = "TASK" | "HABIT" | "QUEST" | "MANUAL";
export type HpState = "GREAT" | "NORMAL" | "TIRED" | "EXHAUSTED" | "CRITICAL";
export type UserRole = "USER" | "ADMIN" | string;
export type UserStatus = "ACTIVE" | "BANNED";
export type ActivityAction = "COMPLETED" | "FAILED" | "RESET" | "DAY_CLOSED" | string;

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}

export interface GameStats {
  xp: number;
  level: number;
  hp: number;
  maxHp: number;
  hpState?: HpState | string;
  streak: number;
  streakShield: boolean;
  nextShieldAt: number;
}

export interface ProfileResponse {
  id: number;
  username: string;
  role: UserRole;
  gameStats: GameStats;
}

export interface TaskResponse {
  id: number;
  title: string;
  description?: string | null;
  difficulty: Difficulty;
  status: TaskStatus;
  deadlineDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  difficulty: Difficulty;
  deadlineDate?: string | null;
}

export interface HabitResponse {
  id: number;
  title: string;
  description?: string | null;
  difficulty: Difficulty;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateHabitRequest {
  title: string;
  description?: string | null;
  difficulty: Difficulty;
}

export type UpdateHabitRequest = CreateHabitRequest;

export interface DailyPlanItemResponse {
  id: number;
  sourceType: SourceType;
  sourceId?: number | null;
  title: string;
  status: DailyPlanItemStatus;
  xpReward: number;
  hpDeltaComplete: number;
  hpDeltaFail: number;
  createdAt?: string;
  completedAt?: string | null;
}

export interface DailyPlanResponse {
  id: number;
  planDate: string;
  status: DailyPlanStatus;
  createdAt?: string;
  startedAt?: string | null;
  closedAt?: string | null;
  items: DailyPlanItemResponse[];
  completedCount?: number;
  failedCount?: number;
  xpEarned?: number;
  hpDelta?: number;
  streakAfterClose?: number;
  shieldUsed?: boolean;
}

export interface CreateManualDailyPlanItemRequest {
  title: string;
}

export interface QuestResponse {
  id: number;
  title: string;
  description?: string | null;
  difficulty: Difficulty;
  status: QuestStatus;
  startDate: string;
  targetDate: string;
  durationDays: number;
  totalSteps: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuestStepResponse {
  id: number;
  questId: number;
  stepNumber: number;
  title: string;
  description?: string | null;
  scheduledDate: string;
  status: QuestStepStatus;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
}

export interface CreateQuestRequest {
  title: string;
  description?: string | null;
  difficulty: Difficulty;
  startDate: string;
  durationDays: number;
  totalSteps: number;
  baseStepTitle: string;
  baseStepDescription?: string | null;
}

export interface UpdateQuestRequest {
  title: string;
  description?: string | null;
  difficulty: Difficulty;
  status: QuestStatus;
}

export interface UpdateQuestStepRequest {
  title: string;
  description?: string | null;
  scheduledDate: string;
}

export interface TodaySummaryResponse {
  planStarted: boolean;
  status?: DailyPlanStatus | null;
  completed: number;
  failed: number;
  pending: number;
  total: number;
}

export interface NearestDeadlineResponse {
  id: number;
  title: string;
  difficulty: Difficulty;
  status: TaskStatus;
  deadlineDate?: string | null;
}

export interface ActiveQuestDashboardResponse {
  id: number;
  title: string;
  difficulty: Difficulty;
  status: QuestStatus;
  targetDate?: string | null;
  completedSteps: number;
  totalSteps: number;
  nextStepId?: number | null;
  nextStepTitle?: string | null;
  nextStepDate?: string | null;
}

export interface DashboardResponse extends GameStats {
  todaySummary: TodaySummaryResponse;
  nearestDeadlines: NearestDeadlineResponse[];
  activeQuests: ActiveQuestDashboardResponse[];
}

export interface CalendarDayResponse {
  date: string;
  status: DailyPlanStatus | "EMPTY";
  completedCount: number;
  totalCount: number;
  xpEarned: number;
  hpDelta: number;
  streakDay: number;
  shieldUsed: boolean;
}

export interface HistoryItemResponse {
  id: number;
  action: ActivityAction;
  sourceType?: SourceType | null;
  sourceId?: number | null;
  title?: string | null;
  planDate?: string | null;
  xpDelta: number;
  hpDelta: number;
  xpAfter: number;
  hpAfter: number;
  streakAfter: number;
  streakShieldAfter: boolean;
  createdAt: string;
}

export interface HistoryPageResponse {
  items: HistoryItemResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface AllTimeStatsResponse {
  bestStreak: number;
  totalXp: number;
  totalTasksCompleted: number;
  totalHabitsCompleted: number;
  totalQuestsCompleted: number;
  bestWeekXp: number;
  bestWeekStartDate?: string | null;
}

export interface ThisWeekStatsResponse {
  xp: number;
  tasksCompleted: number;
  habitsCompleted: number;
  activeDays: number;
}

export interface XpByWeekResponse {
  weekStart: string;
  xp: number;
}

export interface StreakHistoryResponse {
  month: string;
  maxStreak: number;
}

export interface StatsResponse {
  allTime: AllTimeStatsResponse;
  thisWeek: ThisWeekStatsResponse;
  xpByWeek: XpByWeekResponse[];
  streakHistory: StreakHistoryResponse[];
}

export interface AchievementResponse {
  id: number;
  key: string;
  title: string;
  description: string;
  category: string;
  xpReward: number;
  unlockedAt: string;
}

export interface AdminUserResponse {
  id: number;
  username: string;
  role: UserRole;
  status: UserStatus;
  xp: number;
  level: number;
  hp: number;
  streak: number;
}

export interface UpdateGameStatsRequest {
  xp?: number | null;
  hp?: number | null;
  streak?: number | null;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}
