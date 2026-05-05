import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/http";
import type {
  CreateTaskRequest,
  DailyPlanItemResponse,
  DailyPlanItemStatus,
  DailyPlanResponse,
  SourceType
} from "../api/types";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Field, TextArea, TextInput, TimeWheelInput } from "../components/FormFields";
import { GameHud } from "../components/GameHud";
import { ErrorLine, Loader } from "../components/Loader";
import { useAchievementWatcher } from "../context/AchievementContext";
import { useGame } from "../context/GameContext";
import { useToast } from "../context/ToastContext";
import { formatTime, itemStatusLabel, pct, planStatusLabel, signed, sourceLabel, todayISO } from "../utils/format";

const sourceFilters: Array<{ value: SourceType | "ALL"; label: string }> = [
  { value: "ALL", label: "Все" },
  { value: "TASK", label: "Задачи" },
  { value: "HABIT", label: "Привычки" },
  { value: "QUEST", label: "Квесты" },
  { value: "MANUAL", label: "Пункты" }
];

const statusFilters: Array<{ value: DailyPlanItemStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Все" },
  { value: "PENDING", label: "В плане" },
  { value: "COMPLETED", label: "Выполненные" },
  { value: "FAILED", label: "Не выполненные" }
];


function todayPlanCacheKey(date: string) {
  return `flowvisior:today-plan:${date}`;
}

function readCachedTodayPlan(date: string): DailyPlanResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(todayPlanCacheKey(date));
    return raw ? JSON.parse(raw) as DailyPlanResponse : null;
  } catch {
    return null;
  }
}

function writeCachedTodayPlan(date: string, plan: DailyPlanResponse | null) {
  if (typeof window === "undefined") return;
  try {
    if (plan) window.sessionStorage.setItem(todayPlanCacheKey(date), JSON.stringify(plan));
    else window.sessionStorage.removeItem(todayPlanCacheKey(date));
  } catch {
    // Cache is only for instant navigation; ignore storage limits/private mode.
  }
}

function createInitialTaskForm(date = todayISO()): CreateTaskRequest {
  return {
    title: "",
    description: "",
    deadlineDate: date,
    plannedTime: "",
    deadlineTime: ""
  };
}

function countStatuses(items: DailyPlanItemResponse[]) {
  return items.reduce<Record<DailyPlanItemStatus, number>>(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { PENDING: 0, COMPLETED: 0, FAILED: 0 }
  );
}

function addDays(date: string, delta: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + delta);
  return next.toISOString().slice(0, 10);
}

function monthDayLabel(date: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(new Date(`${date}T12:00:00`));
}

function cycleLabel(status: DailyPlanItemStatus) {
  if (status === "PENDING") return "Отметить как выполненную";
  if (status === "COMPLETED") return "Отметить как не выполненную";
  return "Вернуть в план";
}

function OptionButton({ active, children, onClick }: { active?: boolean; children: string; onClick: () => void }) {
  return <button type="button" className={`option-chip ${active ? "active" : ""}`} onClick={onClick}>{children}</button>;
}

function sortByPlannedTime(items: DailyPlanItemResponse[]) {
  return [...items].sort((a, b) => {
    const left = a.plannedTime || "99:99";
    const right = b.plannedTime || "99:99";
    return left.localeCompare(right) || a.title.localeCompare(b.title, "ru");
  });
}


function HpXpLine({ xp, hp }: { xp: number; hp: number }) {
  return (
    <span className="reward-line">
      <span className="xp-token">XP {signed(xp)}</span>
      <span className="hp-token">HP {signed(hp)}</span>
    </span>
  );
}

function StatusIcon({ status }: { status: DailyPlanItemStatus }) {
  if (status === "COMPLETED") {
    return (
      <svg className="status-cycle-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M4.1 8.3 6.8 11 12.2 5" />
      </svg>
    );
  }
  if (status === "FAILED") {
    return (
      <svg className="status-cycle-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M4 8h8" />
      </svg>
    );
  }
  return null;
}

export function TodayPage() {
  const today = todayISO();
  const cachedPlan = useMemo(() => readCachedTodayPlan(today), [today]);
  const { profile, refreshProfile } = useGame();
  const { notify } = useToast();
  const { syncAchievements } = useAchievementWatcher();
  const [plan, setPlan] = useState<DailyPlanResponse | null>(cachedPlan);
  const [loading, setLoading] = useState(!cachedPlan);
  const [error, setError] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<CreateTaskRequest>(() => createInitialTaskForm(today));
  const [sourceFilter, setSourceFilter] = useState<SourceType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<DailyPlanItemStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [sortByTime, setSortByTime] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [taskOptions, setTaskOptions] = useState({ deadline: false, time: false, description: false });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [openDescriptionId, setOpenDescriptionId] = useState<number | null>(null);

  const loadPlan = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await api.dailyPlans.byDate(today);
      setPlan(data);
      writeCachedTodayPlan(today, data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setPlan(null);
        writeCachedTodayPlan(today, null);
      } else setError(err instanceof Error ? err.message : "Не удалось загрузить день");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [today]);


  useEffect(() => {
    loadPlan();
  }, [loadPlan]);


  const items = plan?.items ?? [];
  const counts = useMemo(() => countStatuses(items), [items]);
  const isClosed = plan?.status === "CLOSED";
  const completedPct = pct(counts.COMPLETED, items.length);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const bySource = sourceFilter === "ALL" || item.sourceType === sourceFilter;
      const byStatus = statusFilter === "ALL" || item.status === statusFilter;
      const byText = !q || item.title.toLowerCase().includes(q);
      return bySource && byStatus && byText;
    });
    return sortByTime ? sortByPlannedTime(filtered) : filtered;
  }, [items, search, sourceFilter, statusFilter, sortByTime]);

  async function startDay() {
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.startByDate(today);
      setPlan(next);
      writeCachedTodayPlan(today, next);
      notify({ tone: "success", title: "День открыт" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть день");
    } finally {
      setBusy(false);
    }
  }

  async function reopenDay() {
    if (!window.confirm("Открыть закрытый день? После 03:00 следующего дня на это может тратиться щит.")) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.reopenByDate(today);
      setPlan(next);
      writeCachedTodayPlan(today, next);
      notify({ tone: "success", title: "День снова открыт" });
      refreshProfile().catch(() => undefined);
      await loadPlan(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть день заново");
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
      deadlineDate: today,
      plannedTime: taskForm.plannedTime || null,
      deadlineTime: taskForm.deadlineTime || null
    };
    try {
      await api.tasks.create(payload);
      setTaskForm(createInitialTaskForm(today));
      setTaskDrawerOpen(false);
      setTaskOptions({ deadline: false, time: false, description: false });
      notify({ tone: "success", title: "Задача создана" });
      await loadPlan(false);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Не удалось создать задачу");
    } finally {
      setBusy(false);
    }
  }

  async function closeDay() {
    if (!window.confirm("Закрыть сегодняшний день?")) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.closeByDate(today);
      setPlan(next);
      writeCachedTodayPlan(today, next);
      notify({ tone: "success", title: "День закрыт" });
      refreshProfile().catch(() => undefined);
      syncAchievements(false).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось закрыть день");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(item: DailyPlanItemResponse, action: "complete" | "fail" | "reset") {
    if (action === "fail" && item.status === "COMPLETED") {
      await api.dailyPlanItems.reset(item.id);
      await api.dailyPlanItems.fail(item.id);
      return;
    }
    await api.dailyPlanItems[action](item.id);
  }

  async function cycleItem(item: DailyPlanItemResponse) {
    if (isClosed || busyItemId === item.id) return;
    const previous = item.status;
    const action: "complete" | "fail" | "reset" = item.status === "PENDING" ? "complete" : item.status === "COMPLETED" ? "fail" : "reset";
    const nextStatus: DailyPlanItemStatus = action === "complete" ? "COMPLETED" : action === "fail" ? "FAILED" : "PENDING";

    setBusyItemId(item.id);
    setPlan((current) => {
      if (!current) return current;
      const next = {
        ...current,
        items: current.items.map((entry) => entry.id === item.id ? { ...entry, status: nextStatus, completedAt: nextStatus === "PENDING" ? null : new Date().toISOString() } : entry)
      };
      writeCachedTodayPlan(today, next);
      return next;
    });

    try {
      await runAction(item, action);
      refreshProfile().catch(() => undefined);
      syncAchievements(false).catch(() => undefined);
      if (item.sourceType === "QUEST") loadPlan(false).catch(() => undefined);
    } catch (err) {
      setPlan((current) => {
        if (!current) return current;
        const next = {
          ...current,
          items: current.items.map((entry) => entry.id === item.id ? { ...entry, status: previous } : entry)
        };
        writeCachedTodayPlan(today, next);
        return next;
      });
      setError(err instanceof Error ? err.message : "Не удалось изменить статус");
    } finally {
      setBusyItemId(null);
    }
  }

  function beginEdit(item: DailyPlanItemResponse) {
    if (isClosed) return;
    setEditingId(item.id);
    setEditTitle(item.title);
  }

  async function saveTitle(item: DailyPlanItemResponse) {
    const title = editTitle.trim();
    if (!title || title === item.title) {
      setEditingId(null);
      return;
    }
    setPlan((current) => {
      if (!current) return current;
      const next = {
        ...current,
        items: current.items.map((entry) => entry.id === item.id ? { ...entry, title } : entry)
      };
      writeCachedTodayPlan(today, next);
      return next;
    });
    setEditingId(null);
    try {
      await api.dailyPlanItems.update(item.id, {
        title,
        description: item.description ?? null,
        plannedTime: item.plannedTime ?? null,
        deadlineTime: item.deadlineTime ?? null
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось переименовать пункт");
      loadPlan(false).catch(() => undefined);
    }
  }

  function handleTitleKey(event: KeyboardEvent<HTMLInputElement>, item: DailyPlanItemResponse) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveTitle(item);
    }
    if (event.key === "Escape") setEditingId(null);
  }

  return (
    <section className="page today-page compact-today-page">
      <header className="day-hero today-hero">
        <p className="eyebrow">{weekdayLabel(today)}</p>
        <h1>{monthDayLabel(today)}</h1>
        <div className="day-status-row">
          <span>{plan ? planStatusLabel(plan.status) : "день не открыт"}</span>
          {plan ? <b>{counts.COMPLETED} / {items.length}</b> : null}
        </div>
        <nav className="day-switcher" aria-label="Переключение дней">
          <Link to={`/calendar/${addDays(today, -1)}`}>← предыдущий</Link>
          <Link to={`/calendar/${addDays(today, 1)}`}>следующий →</Link>
        </nav>
      </header>

      {loading ? <Loader label="Загружаем день" /> : null}
      <ErrorLine error={error} />

      {!loading && !plan ? (
        <section className="section-line start-day-line clean-section center-open-day-panel">
          <h2>Открыть день</h2>
          <Button onClick={startDay} disabled={busy}>{busy ? "Открываем" : "Открыть день"}</Button>
        </section>
      ) : null}

      {plan && !isClosed ? (
        <section className="section-line task-create-panel drawer-host clean-section center-add-panel">
          <div className="center-add-actions">
            <Button type="button" onClick={() => setTaskDrawerOpen((value) => !value)} aria-expanded={taskDrawerOpen}>
              {taskDrawerOpen ? "Скрыть задачу" : "Добавить задачу"}
            </Button>
          </div>

          {taskDrawerOpen ? (
            <form className="form-grid task-form task-drawer unified-form compact-create-form ordered-form centered-task-form" onSubmit={createTask}>
              <Field label="Название">
                <TextInput value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required maxLength={160} placeholder="Например: подготовить отчёт" />
              </Field>
              <div className="optional-toolbar">
                <OptionButton active={taskOptions.time || Boolean(taskForm.plannedTime)} onClick={() => setTaskOptions((state) => ({ ...state, time: !state.time }))}>
                  {taskForm.plannedTime ? `Время: ${formatTime(taskForm.plannedTime)}` : "Время"}
                </OptionButton>
                <OptionButton active={taskOptions.deadline || Boolean(taskForm.deadlineTime)} onClick={() => setTaskOptions((state) => ({ ...state, deadline: !state.deadline }))}>
                  {taskForm.deadlineTime ? `Дедлайн: ${formatTime(taskForm.deadlineTime)}` : "Дедлайн"}
                </OptionButton>
                <OptionButton active={taskOptions.description || Boolean(taskForm.description)} onClick={() => setTaskOptions((state) => ({ ...state, description: !state.description }))}>
                  Описание
                </OptionButton>
              </div>
              {taskOptions.time ? <Field label="Плановое время"><TimeWheelInput value={taskForm.plannedTime ?? null} onChange={(value) => setTaskForm({ ...taskForm, plannedTime: value })} /></Field> : null}
              {taskOptions.deadline ? <Field label="Дедлайн"><TimeWheelInput value={taskForm.deadlineTime ?? null} onChange={(value) => setTaskForm({ ...taskForm, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" /></Field> : null}
              {taskOptions.description ? <Field label="Описание"><TextArea value={taskForm.description ?? ""} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} /></Field> : null}
              <ErrorLine error={taskError} />
              <div className="form-actions"><Button disabled={busy || !taskForm.title.trim()}>{busy ? "Сохраняем" : "Создать"}</Button></div>
            </form>
          ) : null}
        </section>
      ) : null}

      <div className="today-grid">
        <main className="today-main">
          {plan ? (
            <section className="section-line plan-section clean-section">
              <div className="section-title-row plan-title-row">
                <h2>Лист дня</h2>
                <div className="plan-progress">
                  <strong>{completedPct}%</strong>
                  <div className="meter"><span style={{ width: `${completedPct}%` }} /></div>
                </div>
              </div>

              <div className="summary-strip soft-strip compact-strip">
                <span>выполнено {counts.COMPLETED}</span>
                <span>в плане {counts.PENDING}</span>
                <span>не выполнено {counts.FAILED}</span>
                {isClosed ? <HpXpLine xp={plan.xpEarned ?? 0} hp={plan.hpDelta ?? 0} /> : null}
              </div>

              <div className="today-controls-row">
                <Button type="button" variant="ghost" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>{filtersOpen ? "Скрыть фильтры" : "Фильтры"}</Button>
                <Button type="button" variant="ghost" onClick={() => setSortByTime((value) => !value)}>{sortByTime ? "Обычный порядок" : "По времени"}</Button>
              </div>

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
                  <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск" />
                </div>
              ) : null}

              {items.length === 0 ? <EmptyState title="Пока пусто" text="Создай задачу или открой нужный квест в календаре." /> : null}
              {items.length > 0 && filteredItems.length === 0 ? <EmptyState title="Ничего не найдено" text="Измени фильтры." /> : null}

              <div className="line-list todo-list typed-list clean-list">
                {filteredItems.map((item) => (
                  <article className={`line-item plan-item status-${item.status.toLowerCase()}`} key={item.id}>
                    <button
                      type="button"
                      className={`status-cycle status-cycle-${item.status.toLowerCase()}`}
                      onClick={() => cycleItem(item)}
                      disabled={busyItemId === item.id || isClosed}
                      aria-label={`${cycleLabel(item.status)}: ${item.title}`}
                    >
                      <StatusIcon status={item.status} />
                    </button>
                    {item.description ? (
                      <button type="button" className={`description-toggle ${openDescriptionId === item.id ? "open" : ""}`} onClick={() => setOpenDescriptionId((current) => current === item.id ? null : item.id)} aria-label="Показать описание">›</button>
                    ) : <span className="description-spacer" />}
                    <div className="todo-main">
                      <div className="item-title-line">
                        {editingId === item.id ? (
                          <TextInput className="inline-edit-input" autoFocus value={editTitle} onChange={(event) => setEditTitle(event.target.value)} onBlur={() => saveTitle(item)} onKeyDown={(event) => handleTitleKey(event, item)} />
                        ) : (
                          <strong className="editable-title" onClick={() => beginEdit(item)}>{item.title}</strong>
                        )}
                        <span className="item-type-badge">{sourceLabel(item.sourceType).toLowerCase()}</span>
                      </div>
                      <p className="muted compact-meta">
                        {itemStatusLabel(item.status)}{item.plannedTime ? ` · ${formatTime(item.plannedTime)}` : ""}{item.deadlineTime ? ` · дедлайн ${formatTime(item.deadlineTime)}` : ""}
                      </p>
                      {openDescriptionId === item.id && item.description ? <p className="item-description">{item.description}</p> : null}
                    </div>
                  </article>
                ))}
              </div>

              <div className="bottom-day-actions">
                {isClosed ? (
                  <Button onClick={reopenDay} disabled={busy}>{busy ? "Открываем" : "Открыть день"}</Button>
                ) : (
                  <Button variant="danger" onClick={closeDay} disabled={busy}>Закрыть день</Button>
                )}
              </div>
            </section>
          ) : null}
        </main>

        <aside className="today-side">
          <section className="section-line character-panel clean-section">
            <Avatar stats={profile?.gameStats} compact variantIndex={1} />
            <Button type="button" variant="ghost" disabled title="Смена аватара появится позже">Сменить аватар</Button>
            <GameHud stats={profile?.gameStats} />
          </section>
        </aside>
      </div>
    </section>
  );
}
