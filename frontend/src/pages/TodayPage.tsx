import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/http";
import type { CreateTaskRequest, DailyPlanItemResponse, DailyPlanItemStatus, DailyPlanResponse, DashboardResponse, SourceType, TaskResponse } from "../api/types";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Field, TextArea, TextInput } from "../components/FormFields";
import { GameHud } from "../components/GameHud";
import { ErrorLine, Loader } from "../components/Loader";
import { useAchievementWatcher } from "../context/AchievementContext";
import { useGame } from "../context/GameContext";
import { useToast } from "../context/ToastContext";
import { formatDate, itemStatusLabel, pct, planStatusLabel, signed, sourceLabel, taskStatusLabel } from "../utils/format";

const sourceFilters: Array<{ value: SourceType | "ALL"; label: string }> = [
  { value: "ALL", label: "Все источники" },
  { value: "TASK", label: "Задачи" },
  { value: "HABIT", label: "Привычки" },
  { value: "QUEST", label: "Квесты" },
  { value: "MANUAL", label: "Вручную" }
];

const statusFilters: Array<{ value: DailyPlanItemStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Все статусы" },
  { value: "PENDING", label: "В плане" },
  { value: "COMPLETED", label: "Выполненные" },
  { value: "FAILED", label: "Не выполненные" }
];

const initialTaskForm: CreateTaskRequest = {
  title: "",
  description: "",
  difficulty: "MEDIUM",
  deadlineDate: ""
};

function countStatuses(items: DailyPlanItemResponse[]) {
  return items.reduce<Record<DailyPlanItemStatus, number>>(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { PENDING: 0, COMPLETED: 0, FAILED: 0 }
  );
}

function nextActionFor(item: DailyPlanItemResponse): "complete" | "fail" | "reset" {
  if (item.status === "PENDING") return "complete";
  if (item.status === "COMPLETED") return "fail";
  return "reset";
}

function cycleLabel(status: DailyPlanItemStatus) {
  if (status === "PENDING") return "Отметить как выполненную";
  if (status === "COMPLETED") return "Отметить как не выполненную";
  return "Вернуть в нейтральный статус";
}

export function TodayPage() {
  const { profile, refreshProfile } = useGame();
  const { notify } = useToast();
  const { syncAchievements } = useAchievementWatcher();
  const [plan, setPlan] = useState<DailyPlanResponse | null>(null);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [taskForm, setTaskForm] = useState<CreateTaskRequest>(initialTaskForm);
  const [addTaskToToday, setAddTaskToToday] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<SourceType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<DailyPlanItemStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(1);
  const [busy, setBusy] = useState(false);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [manualDrawerOpen, setManualDrawerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = await api.dailyPlans.today();
      setPlan(today);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setPlan(null);
      else setError(err instanceof Error ? err.message : "Не удалось загрузить план дня");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAux = useCallback(async () => {
    setTasksLoading(true);
    try {
      const [taskList, dash] = await Promise.all([
        api.tasks.list().catch(() => [] as TaskResponse[]),
        api.dashboard.get().catch(() => null)
      ]);
      setTasks(taskList);
      setDashboard(dash);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
    loadAux();
  }, [loadPlan, loadAux]);

  const items = plan?.items ?? [];
  const counts = useMemo(() => countStatuses(items), [items]);
  const isClosed = plan?.status === "CLOSED";
  const completedPct = pct(counts.COMPLETED, items.length);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const bySource = sourceFilter === "ALL" || item.sourceType === sourceFilter;
      const byStatus = statusFilter === "ALL" || item.status === statusFilter;
      const byText = !q || item.title.toLowerCase().includes(q);
      return bySource && byStatus && byText;
    });
  }, [items, search, sourceFilter, statusFilter]);

  const nearestDeadlines = useMemo(() => {
    if (dashboard?.nearestDeadlines?.length) return dashboard.nearestDeadlines;
    return tasks
      .filter((task) => task.deadlineDate)
      .sort((a, b) => String(a.deadlineDate).localeCompare(String(b.deadlineDate)))
      .slice(0, 5);
  }, [dashboard, tasks]);

  async function startDay() {
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.startToday();
      setPlan(next);
      notify({ tone: "success", title: "День начат" });
      await loadAux();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось начать день");
    } finally {
      setBusy(false);
    }
  }

  async function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan || isClosed) return;
    const title = manualTitle.trim();
    if (!title) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.addManualItem(plan.id, { title });
      setPlan(next);
      setManualTitle("");
      setManualDrawerOpen(false);
      notify({ tone: "success", title: "Пункт добавлен в Today" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить пункт");
    } finally {
      setBusy(false);
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setTaskError(null);
    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description?.trim() || null,
      difficulty: "MEDIUM" as const,
      deadlineDate: taskForm.deadlineDate || null
    };
    try {
      await api.tasks.create(payload);
      if (addTaskToToday && plan && !isClosed) {
        const next = await api.dailyPlans.addManualItem(plan.id, { title: payload.title });
        setPlan(next);
      }
      setTaskForm(initialTaskForm);
      setTaskDrawerOpen(false);
      notify({ tone: "success", title: addTaskToToday && plan && !isClosed ? "Задача создана и добавлена в Today" : "Задача создана" });
      await loadAux();
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Не удалось создать задачу");
    } finally {
      setBusy(false);
    }
  }

  async function closeDay() {
    if (!window.confirm("Закрыть сегодняшний план? После закрытия день нельзя редактировать.")) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.closeToday();
      setPlan(next);
      notify({ tone: "success", title: "День закрыт" });
      refreshProfile().catch(() => undefined);
      syncAchievements(false).catch(() => undefined);
      loadAux().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось закрыть день");
    } finally {
      setBusy(false);
    }
  }

  async function act(item: DailyPlanItemResponse, action: "complete" | "fail" | "reset") {
    const previous = item.status;
    const nextStatus: DailyPlanItemStatus = action === "complete" ? "COMPLETED" : action === "fail" ? "FAILED" : "PENDING";
    const title = action === "complete" ? "Задача выполнена" : action === "fail" ? "Задача отмечена как не выполненная" : "Задача снова в плане";

    setBusyItemId(item.id);
    setError(null);
    setPlan((current) => current ? {
      ...current,
      items: current.items.map((entry) => entry.id === item.id ? { ...entry, status: nextStatus, completedAt: nextStatus === "COMPLETED" ? new Date().toISOString() : null } : entry)
    } : current);

    try {
      await api.dailyPlanItems[action](item.id);
      notify({ tone: action === "fail" ? "info" : "success", title });
      refreshProfile().catch(() => undefined);
      syncAchievements(false).catch(() => undefined);
      loadPlan().catch(() => undefined);
      loadAux().catch(() => undefined);
    } catch (err) {
      setPlan((current) => current ? {
        ...current,
        items: current.items.map((entry) => entry.id === item.id ? { ...entry, status: previous } : entry)
      } : current);
      setError(err instanceof Error ? err.message : "Не удалось изменить статус");
    } finally {
      setBusyItemId(null);
    }
  }

  function cycleItem(item: DailyPlanItemResponse) {
    if (isClosed || busyItemId === item.id) return;
    act(item, nextActionFor(item));
  }

  return (
    <section className="page today-page">
      <header className="page-header split-header compact-header">
        <div>
          <p className="eyebrow">главный экран</p>
          <h1>Today</h1>
          <p className="muted">План дня, привычки, квесты, дедлайны и состояние персонажа.</p>
        </div>
        <div className="header-actions">
          <Button variant="ghost" onClick={() => { loadPlan(); loadAux(); }}>Обновить</Button>
          {plan && !isClosed ? <Button variant="danger" onClick={closeDay} disabled={busy}>Закрыть день</Button> : null}
        </div>
      </header>

      <section className="section-line top-task-panel">
        <div className="section-title-row small-title-row">
          <div>
            <p className="eyebrow">быстрое действие</p>
            <h2>Добавить задачу</h2>
            <p className="muted">Форма скрыта, пока она не нужна.</p>
          </div>
          <Button type="button" variant={taskDrawerOpen ? "thin" : "primary"} onClick={() => setTaskDrawerOpen((value) => !value)} aria-expanded={taskDrawerOpen}>
            {taskDrawerOpen ? "Скрыть форму" : "Добавить задачу"}
          </Button>
        </div>
        {taskDrawerOpen ? (
          <form className="form-grid task-form task-drawer" onSubmit={createTask}>
            <Field label="Название">
              <TextInput value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required maxLength={160} />
            </Field>
            <Field label="Дедлайн">
              <TextInput type="date" value={taskForm.deadlineDate ?? ""} onChange={(event) => setTaskForm({ ...taskForm, deadlineDate: event.target.value })} />
            </Field>
            <Field label="Описание">
              <TextArea value={taskForm.description ?? ""} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} />
            </Field>
            <label className="check-line">
              <input type="checkbox" checked={addTaskToToday} onChange={(event) => setAddTaskToToday(event.target.checked)} disabled={!plan || isClosed} />
              <span>сразу добавить в Today</span>
            </label>
            <ErrorLine error={taskError} />
            <div className="form-actions"><Button disabled={busy || !taskForm.title.trim()}>{busy ? "Сохраняем" : "Создать задачу"}</Button></div>
          </form>
        ) : null}
      </section>

      {loading ? <Loader label="Загружаем Today" /> : null}
      <ErrorLine error={error} />

      {!loading && !plan ? (
        <section className="section-line start-day-line">
          <div>
            <p className="eyebrow">план не открыт</p>
            <h2>Начать день</h2>
            <p className="muted">Активные привычки и шаги квестов на сегодня появятся в списке.</p>
          </div>
          <Button onClick={startDay} disabled={busy}>{busy ? "Запускаем" : "Начать день"}</Button>
        </section>
      ) : null}

      <div className="today-grid">
        <div className="today-main">
          {plan ? (
            <section className="section-line plan-section">
              <div className="section-title-row plan-title-row">
                <div>
                  <p className="eyebrow">{formatDate(plan.planDate)}</p>
                  <h2>{planStatusLabel(plan.status)}</h2>
                </div>
                <div className="plan-progress">
                  <strong>{completedPct}%</strong>
                  <div className="meter"><span style={{ width: `${completedPct}%` }} /></div>
                </div>
              </div>

              <div className="summary-strip soft-strip">
                <span>выполнено {counts.COMPLETED}</span>
                <span>в плане {counts.PENDING}</span>
                <span>не выполнено {counts.FAILED}</span>
                <span>всего {items.length}</span>
                {isClosed ? <span>XP {plan.xpEarned ?? "—"} · HP {signed(plan.hpDelta)}</span> : null}
              </div>

              {!isClosed ? (
                <div className="today-controls-row">
                  <Button type="button" variant="ghost" onClick={() => setManualDrawerOpen((value) => !value)} aria-expanded={manualDrawerOpen}>
                    {manualDrawerOpen ? "Скрыть быстрый пункт" : "Добавить пункт в Today"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>
                    {filtersOpen ? "Скрыть фильтры" : "Фильтры"}
                  </Button>
                </div>
              ) : (
                <div className="today-controls-row">
                  <Button type="button" variant="ghost" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>
                    {filtersOpen ? "Скрыть фильтры" : "Фильтры"}
                  </Button>
                </div>
              )}

              {!isClosed && manualDrawerOpen ? (
                <form className="quick-add drawer-panel" onSubmit={addManual}>
                  <TextInput value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder="Например: разобрать почту" required maxLength={160} />
                  <Button disabled={busy || !manualTitle.trim()}>Добавить</Button>
                </form>
              ) : null}

              {filtersOpen ? (
                <div className="filter-panel drawer-panel">
                  <div className="filter-row">
                    {sourceFilters.map((filter) => (
                      <button type="button" key={filter.value} className={sourceFilter === filter.value ? "active" : ""} onClick={() => setSourceFilter(filter.value)}>{filter.label}</button>
                    ))}
                  </div>
                  <div className="filter-row muted-row">
                    {statusFilters.map((filter) => (
                      <button type="button" key={filter.value} className={statusFilter === filter.value ? "active" : ""} onClick={() => setStatusFilter(filter.value)}>{filter.label}</button>
                    ))}
                  </div>
                  <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по Today" />
                </div>
              ) : null}

              {items.length === 0 ? <EmptyState title="В Today пока пусто" text="Добавь пункт вручную, создай задачу или настрой активные привычки и квесты." /> : null}
              {items.length > 0 && filteredItems.length === 0 ? <EmptyState title="Ничего не найдено" text="Измени фильтры или очисти поиск." /> : null}

              <div className="line-list todo-list">
                {filteredItems.map((item) => (
                  <article className={`line-item plan-item status-${item.status.toLowerCase()} source-${item.sourceType.toLowerCase()}`} key={item.id}>
                    <button
                      type="button"
                      className={`status-cycle status-cycle-${item.status.toLowerCase()}`}
                      onClick={() => cycleItem(item)}
                      disabled={busyItemId === item.id || isClosed}
                      aria-label={`${cycleLabel(item.status)}: ${item.title}`}
                      title={cycleLabel(item.status)}
                    />
                    <div className="todo-main">
                      <strong>{item.title}</strong>
                      <p className="muted">
                        {sourceLabel(item.sourceType)} · {itemStatusLabel(item.status)} · XP {item.xpReward} · HP {signed(item.hpDeltaComplete)} / {signed(item.hpDeltaFail)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="today-side">
          <section className="section-line character-panel">
            <Avatar stats={profile?.gameStats} compact variantIndex={avatarIndex} />
            <div className="avatar-picker" aria-label="Выбор аватара">
              {[1, 2, 3].map((index) => <button type="button" key={index} className={avatarIndex === index ? "active" : ""} onClick={() => setAvatarIndex(index)}>{index}</button>)}
            </div>
            <GameHud stats={profile?.gameStats} />
          </section>

          <section className="section-line">
            <div className="section-title-row small-title-row">
              <div>
                <p className="eyebrow">дедлайны</p>
                <h2>Ближайшие</h2>
              </div>
              {tasksLoading ? <span className="muted">загрузка</span> : null}
            </div>
            {nearestDeadlines.length === 0 ? <EmptyState title="Дедлайнов нет" text="Задачи с датой появятся здесь." /> : null}
            <div className="mini-list">
              {nearestDeadlines.map((task) => (
                <article className="mini-row" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <p className="muted">{taskStatusLabel(task.status)}</p>
                  </div>
                  <span>{formatDate(task.deadlineDate)}</span>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
