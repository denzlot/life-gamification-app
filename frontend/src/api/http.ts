import type {
  AchievementResponse,
  AdminUserResponse,
  AuthUser,
  CalendarDayResponse,
  CreateHabitRequest,
  CreateManualDailyPlanItemRequest,
  CreateQuestRequest,
  CreateTaskRequest,
  DailyPlanResponse,
  DashboardResponse,
  HabitResponse,
  HistoryPageResponse,
  ProfileResponse,
  QuestResponse,
  QuestStepResponse,
  StatsResponse,
  TaskResponse,
  UpdateGameStatsRequest,
  UpdateHabitRequest,
  UpdateQuestRequest,
  UpdateQuestStepRequest,
  UpdateUserStatusRequest
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/$/, "");

type QueryValue = string | number | boolean | null | undefined;

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function withQuery(path: string, query?: Record<string, QueryValue>) {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

async function readResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204) return undefined;
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  return text || undefined;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const hasBody = init.body !== undefined && init.body !== null;
  if (hasBody && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });

  const data = await readResponse(response);

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : data && typeof data === "object" && "message" in data
          ? String((data as { message?: unknown }).message)
          : response.status === 401
            ? "Нужно войти в аккаунт"
            : response.status === 403
              ? "Доступ закрыт"
              : response.status === 404
                ? "Не найдено"
                : `Ошибка запроса: ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  auth: {
    me: () => request<AuthUser>("/auth/me"),
    login: (payload: { username: string; password: string }) =>
      request<AuthUser>("/auth/login", { method: "POST", body: json(payload) }),
    register: (payload: { username: string; password: string }) =>
      request<AuthUser>("/auth/register", { method: "POST", body: json(payload) }),
    logout: () => request<void>("/auth/logout", { method: "POST" })
  },
  profile: {
    get: () => request<ProfileResponse>("/profile"),
    achievements: () => request<AchievementResponse[]>("/profile/achievements")
  },
  dashboard: {
    get: () => request<DashboardResponse>("/dashboard")
  },
  tasks: {
    list: () => request<TaskResponse[]>("/tasks"),
    create: (payload: CreateTaskRequest) => request<TaskResponse>("/tasks", { method: "POST", body: json(payload) })
  },
  habits: {
    list: () => request<HabitResponse[]>("/habits"),
    create: (payload: CreateHabitRequest) => request<HabitResponse>("/habits", { method: "POST", body: json(payload) }),
    update: (id: number, payload: UpdateHabitRequest) => request<HabitResponse>(`/habits/${id}`, { method: "PATCH", body: json(payload) }),
    toggleActive: (id: number) => request<HabitResponse>(`/habits/${id}/toggle-active`, { method: "PATCH" }),
    delete: (id: number) => request<void>(`/habits/${id}`, { method: "DELETE" })
  },
  dailyPlans: {
    today: () => request<DailyPlanResponse>("/daily-plans/today"),
    startToday: () => request<DailyPlanResponse>("/daily-plans/today/start", { method: "POST" }),
    closeToday: () => request<DailyPlanResponse>("/daily-plans/today/close", { method: "POST" }),
    addManualItem: (planId: number, payload: CreateManualDailyPlanItemRequest) =>
      request<DailyPlanResponse>(`/daily-plans/${planId}/items`, { method: "POST", body: json(payload) })
  },
  dailyPlanItems: {
    complete: (id: number) => request<void>(`/daily-plan-items/${id}/complete`, { method: "POST" }),
    fail: (id: number) => request<void>(`/daily-plan-items/${id}/fail`, { method: "POST" }),
    reset: (id: number) => request<void>(`/daily-plan-items/${id}/reset`, { method: "POST" })
  },
  quests: {
    list: () => request<QuestResponse[]>("/quests"),
    create: (payload: CreateQuestRequest) => request<QuestResponse>("/quests", { method: "POST", body: json(payload) }),
    get: (id: number) => request<QuestResponse>(`/quests/${id}`),
    update: (id: number, payload: UpdateQuestRequest) => request<QuestResponse>(`/quests/${id}`, { method: "PATCH", body: json(payload) }),
    delete: (id: number) => request<void>(`/quests/${id}`, { method: "DELETE" }),
    steps: (id: number) => request<QuestStepResponse[]>(`/quests/${id}/steps`),
    updateStep: (id: number, payload: UpdateQuestStepRequest) => request<QuestStepResponse>(`/quest-steps/${id}`, { method: "PATCH", body: json(payload) })
  },
  calendar: {
    month: (year: number, month: number) => request<CalendarDayResponse[]>(withQuery("/calendar", { year, month }))
  },
  stats: {
    get: () => request<StatsResponse>("/stats")
  },
  history: {
    get: (page = 0, size = 20) => request<HistoryPageResponse>(withQuery("/history", { page, size }))
  },
  admin: {
    users: () => request<AdminUserResponse[]>("/admin/users"),
    updateStatus: (id: number, payload: UpdateUserStatusRequest) =>
      request<AdminUserResponse>(`/admin/users/${id}/status`, { method: "PATCH", body: json(payload) }),
    updateGameStats: (id: number, payload: UpdateGameStatsRequest) =>
      request<AdminUserResponse>(`/admin/users/${id}/game-stats`, { method: "PATCH", body: json(payload) })
  }
};
