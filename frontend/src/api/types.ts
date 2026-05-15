export type TaskStatus = "OPEN" | "TODO" | "PENDING" | "COMPLETED" | "FAILED" | string;
export type HabitStatus = string;
export type QuestStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type QuestStepStatus = "PENDING" | "COMPLETED" | "SKIPPED";
export type DailyPlanStatus = "PLANNED" | "ACTIVE" | "CLOSED";
export type DailyPlanItemStatus = "PENDING" | "COMPLETED" | "FAILED";
export type DayQuality = "EMPTY" | "BAD" | "NORMAL" | "GOOD";
export type SourceType = "TASK" | "HABIT" | "QUEST" | "MANUAL";
export type HabitScheduleType = "WEEKLY" | "MONTHLY" | "INTERVAL";
export type HpState = "GREAT" | "NORMAL" | "TIRED" | "EXHAUSTED" | "CRITICAL";
export type UserRole = "USER" | "ADMIN" | string;
export type UserStatus = "ACTIVE" | "BANNED";
export type ActivityAction = "COMPLETED" | "FAILED" | "RESET" | "DAY_CLOSED" | string;
export type FocusCreditedMode = "PLANNED" | "ACTUAL";

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
  selectedTheme?: string;
  selectedCharacter?: string;
  unlocks?: UnlockResponse[];
}

export interface UnlockResponse {
  key: string;
  type: "THEME" | "CHARACTER" | string;
  targetKey: string;
  title: string;
  requiredLevel: number;
  unlocked: boolean;
  unlockedAt?: string | null;
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
  status: TaskStatus;
  deadlineDate?: string | null;
  plannedTime?: string | null;
  deadlineTime?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  deadlineDate?: string | null;
  plannedTime?: string | null;
  deadlineTime?: string | null;
}

export interface HabitResponse {
  id: number;
  title: string;
  description?: string | null;
  plannedTime?: string | null;
  deadlineTime?: string | null;
  scheduleType: HabitScheduleType;
  scheduleDays: number[];
  monthlyDay?: number | null;
  intervalDays?: number | null;
  intervalStartDate?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateHabitRequest {
  title: string;
  description?: string | null;
  plannedTime?: string | null;
  deadlineTime?: string | null;
  scheduleType?: HabitScheduleType;
  scheduleDays?: number[];
  monthlyDay?: number | null;
  intervalDays?: number | null;
  intervalStartDate?: string | null;
}

export type UpdateHabitRequest = CreateHabitRequest;

export interface DailyPlanItemResponse {
  id: number;
  sourceType: SourceType;
  sourceId?: number | null;
  title: string;
  plannedTime?: string | null;
  deadlineTime?: string | null;
  description?: string | null;
  status: DailyPlanItemStatus;
  xpReward: number;
  hpDeltaComplete: number;
  hpDeltaFail: number;
  createdAt?: string;
  completedAt?: string | null;
  focusSpentSeconds?: number | null;
}

export interface DailyPlanResponse {
  id: number;
  planDate: string;
  status: DailyPlanStatus;
  createdAt?: string;
  startedAt?: string | null;
  closedAt?: string | null;
  note?: string | null;
  items: DailyPlanItemResponse[];
  completedCount?: number;
  failedCount?: number;
  totalCountAtClose?: number;
  completionRateAtClose?: number;
  dayQuality?: DayQuality;
  xpEarned?: number;
  hpDelta?: number;
  streakAfterClose?: number;
  shieldUsed?: boolean;
  automatic?: boolean;
}

export interface CreateManualDailyPlanItemRequest {
  title: string;
  description?: string | null;
  plannedTime?: string | null;
  deadlineTime?: string | null;
}

export interface UpdateDailyPlanNoteRequest {
  note: string | null;
}

export interface QuestResponse {
  id: number;
  title: string;
  description?: string | null;
  plannedTime?: string | null;
  deadlineTime?: string | null;
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
  baselineScheduledDate?: string | null;
  plannedTime?: string | null;
  deadlineTime?: string | null;
  status: QuestStepStatus;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
}

export interface CreateQuestRequest {
  title: string;
  description?: string | null;
  plannedTime?: string | null;
  deadlineTime?: string | null;
  startDate: string;
  durationDays: number;
  totalSteps: number;
  baseStepTitle: string;
  baseStepDescription?: string | null;
  planMode?: "AUTO" | "MANUAL";
  steps?: CreateQuestStepRequest[];
}

export interface CreateQuestStepRequest {
  title: string;
  description?: string | null;
  baselineScheduledDate?: string | null;
  plannedTime?: string | null;
  deadlineTime?: string | null;
}

export interface UpdateQuestRequest {
  title: string;
  description?: string | null;
  plannedTime?: string | null;
  deadlineTime?: string | null;
  status: QuestStatus;
}

export interface UpdateQuestStepRequest {
  title: string;
  description?: string | null;
  scheduledDate: string;
  plannedTime?: string | null;
  deadlineTime?: string | null;
}

export interface UpdateDailyPlanItemRequest {
  title: string;
  description?: string | null;
  plannedTime?: string | null;
  deadlineTime?: string | null;
}


export interface CreateFocusSessionRequest {
  sessionId: string;
  sourceType: SourceType;
  sourceId?: number | null;
  title: string;
  durationSeconds: number;
  plannedDurationSeconds: number;
  actualElapsedSeconds: number;
  overtimeSeconds: number;
  creditedDurationSeconds: number;
  creditedMode: FocusCreditedMode;
  completedAt: string;
  planDate: string;
}

export interface CompleteDailyPlanItemRequest {
  focusSession?: CreateFocusSessionRequest | null;
}

export interface FocusSessionResponse {
  id: number;
  sessionId: string;
  userId: number;
  sourceType: SourceType;
  sourceId?: number | null;
  title: string;
  durationSeconds: number;
  plannedDurationSeconds: number;
  actualElapsedSeconds: number;
  overtimeSeconds: number;
  creditedDurationSeconds: number;
  creditedMode: FocusCreditedMode;
  completedAt: string;
  planDate: string;
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
  status: TaskStatus;
  deadlineDate?: string | null;
  plannedTime?: string | null;
}

export interface ActiveQuestDashboardResponse {
  id: number;
  title: string;
  plannedTime?: string | null;
  status: QuestStatus;
  targetDate?: string | null;
  completedSteps: number;
  totalSteps: number;
  nextStepId?: number | null;
  nextStepTitle?: string | null;
  nextStepDate?: string | null;
  nextStepTime?: string | null;
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
  taskCount?: number;
  habitCount?: number;
  questCount?: number;
  taskCompletedCount?: number;
  habitCompletedCount?: number;
  questCompletedCount?: number;
  xpEarned: number;
  hpDelta: number;
  streakDay: number;
  shieldUsed: boolean;
  dayQuality?: DayQuality | null;
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


export interface FocusStatsResponse {
  totalSeconds: number;
  taskSeconds: number;
  habitSeconds: number;
  questSeconds: number;
  plannedSeconds: number;
  actualSeconds: number;
  overtimeSeconds: number;
}

export interface StatsResponse {
  allTime: AllTimeStatsResponse;
  thisWeek: ThisWeekStatsResponse;
  xpByWeek: XpByWeekResponse[];
  streakHistory: StreakHistoryResponse[];
  focus: FocusStatsResponse;
}

export interface AchievementResponse {
  id: number;
  key: string;
  title: string;
  description: string;
  category: string;
  xpReward: number;
  requiredValue: number;
  unlocked: boolean;
  unlockedAt?: string | null;
  progress: number;
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

export interface TelegramSettingsResponse {
  linked: boolean;
  remindersEnabled: boolean;
  plannedRemindersEnabled: boolean;
  deadlineRemindersEnabled: boolean;
}

export interface TelegramSettingsRequest {
  remindersEnabled: boolean;
  plannedRemindersEnabled: boolean;
  deadlineRemindersEnabled: boolean;
}

export interface CreateTelegramLinkResponse {
  linkCode: string;
  deepLink?: string | null;
  expiresAt: string;
}
