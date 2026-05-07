import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { DateWheelInput, Field, TextArea, TextInput, TimeWheelInput } from "../components/FormFields";
import { GameHud } from "../components/GameHud";
import { ErrorLine, Loader } from "../components/Loader";
import { useAchievementWatcher } from "../context/AchievementContext";
import { useGame } from "../context/GameContext";
import { useToast } from "../context/ToastContext";
import { formatDate, formatTime, itemStatusLabel, pct, planStatusLabel, signed, sourceLabel, todayISO } from "../utils/format";

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

const itemGroups: Array<{ source: SourceType; title: string }> = [
  { source: "TASK", title: "Задачи" },
  { source: "HABIT", title: "Привычки" },
  { source: "QUEST", title: "Квесты" },
  { source: "MANUAL", title: "Пункты" }
];

function groupedBySource(items: DailyPlanItemResponse[]) {
  return itemGroups
    .map((group) => ({ ...group, items: items.filter((item) => item.sourceType === group.source) }))
    .filter((group) => group.items.length > 0);
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
  return (
    <svg className="status-cycle-svg" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle className="status-cycle-ring" cx="10" cy="10" r="8.2" />
      {status === "COMPLETED" ? <path className="status-cycle-mark" d="M5.8 10.2 8.6 13 14.3 7" /> : null}
      {status === "FAILED" ? <path className="status-cycle-mark" d="M5.8 10h8.4" /> : null}
    </svg>
  );
}

function closeDayQuestion(completedCount: number) {
  if (completedCount > 0) return "Закрыть сегодняшний день?";
  return "В этом дне пока нет выполненных задач. Если закрыть его сейчас, персонаж потеряет HP. Закрыть день?";
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
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(cachedPlan?.note ?? "");
  const [noteSaving, setNoteSaving] = useState(false);
  const filtersHostRef = useRef<HTMLDivElement | null>(null);

  const loadPlan = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await api.dailyPlans.byDate(today);
      setPlan(data);
      setNoteDraft(data.note ?? "");
      writeCachedTodayPlan(today, data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setPlan(null);
        setNoteDraft("");
        writeCachedTodayPlan(today, null);
      } else setError(err instanceof Error ? err.message : "Не удалось загрузить день");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [today]);


  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (!filtersOpen) return undefined;

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && filtersHostRef.current?.contains(target)) return;
      setFiltersOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [filtersOpen]);


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
  const groupedItems = useMemo(() => groupedBySource(filteredItems), [filteredItems]);

  async function startDay() {
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.startByDate(today);
      setPlan(next);
      setNoteDraft(next.note ?? "");
      writeCachedTodayPlan(today, next);
      notify({ tone: "success", title: "День открыт" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть день");
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
      deadlineDate: taskForm.deadlineDate || today,
      plannedTime: taskForm.plannedTime || null,
      deadlineTime: taskForm.deadlineTime || null
    };
    try {
      await api.tasks.create(payload);
      setTaskForm(createInitialTaskForm(today));
      setTaskDrawerOpen(false);
      setTaskOptions({ deadline: false, time: false, description: false });
      notify({ tone: "success", title: taskForm.deadlineDate === today ? "Задача создана" : `Задача создана на ${formatDate(taskForm.deadlineDate || today)}` });
      await loadPlan(false);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Не удалось создать задачу");
    } finally {
      setBusy(false);
    }
  }

  async function closeDay() {
    if (!window.confirm(closeDayQuestion(counts.COMPLETED))) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.closeByDate(today);
      setPlan(next);
      setNoteDraft(next.note ?? "");
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

  async function saveNote() {
    setNoteSaving(true);
    setError(null);
    try {
      const next = await api.dailyPlans.updateNoteByDate(today, { note: noteDraft.trim() || null });
      setPlan(next);
      setNoteDraft(next.note ?? "");
      writeCachedTodayPlan(today, next);
      notify({ tone: "success", title: "Заметка сохранена" });
      setNoteOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить заметку");
    } finally {
      setNoteSaving(false);
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
        <div className="date-inline-switcher day-date-inline" aria-label="Переключение дней">
          <Link className="nav-text-button" to={`/calendar/${addDays(today, -1)}`} aria-label="Предыдущий день">← предыдущий</Link>
          <h1>{monthDayLabel(today)}</h1>
          <Link className="nav-text-button" to={`/calendar/${addDays(today, 1)}`} aria-label="Следующий день">следующий →</Link>
        </div>
        <div className="day-status-row">
          <span>{plan ? planStatusLabel(plan.status) : "день не открыт"}</span>
        </div>
      </header>

      {loading ? <Loader label="Загружаем день" /> : null}
      <ErrorLine error={error} />

      {!loading && !plan ? (
        <>
          <section className="section-line start-day-line clean-section center-open-day-panel">
            <Button onClick={startDay} disabled={busy}>{busy ? "Открываем" : "Открыть день"}</Button>
          </section>
          <section className="section-line clean-section today-pre-character-card">
            <div className="today-pre-avatar-slot">
              <Avatar stats={profile?.gameStats} compact />
            </div>
            <div className="today-pre-stats-slot">
              <p className="eyebrow">персонаж</p>
              <h2>Готов к дню</h2>
              <GameHud stats={profile?.gameStats} />
            </div>
          </section>
        </>
      ) : null}

      {!isClosed && !plan ? (
        <section className="section-line task-create-panel drawer-host clean-section center-add-panel">
          <div className="center-add-actions">
            <Button type="button" onClick={() => setTaskDrawerOpen((value) => !value)} aria-expanded={taskDrawerOpen}>
              {taskDrawerOpen ? "Скрыть задачу" : "Добавить задачу"}
            </Button>
          </div>

          {taskDrawerOpen ? (
            <div className="modal-backdrop form-modal-backdrop" role="presentation" onMouseDown={() => setTaskDrawerOpen(false)}>
              <form className="form-grid task-form task-drawer unified-form compact-create-form ordered-form centered-task-form modal-form-card" onSubmit={createTask} role="dialog" aria-modal="true" aria-label="Создание задачи" onMouseDown={(event) => event.stopPropagation()}>
                <div className="modal-form-head">
                  <div><p className="eyebrow">новая задача</p><strong>Добавить задачу</strong></div>
                  <button type="button" className="dialog-close" onClick={() => setTaskDrawerOpen(false)} aria-label="Закрыть">×</button>
                </div>
              <Field label="Название">
                <TextInput value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required maxLength={160} placeholder="Например: подготовить отчёт" />
              </Field>
              <Field label="Дата задачи">
                <DateWheelInput value={taskForm.deadlineDate || today} onChange={(value) => setTaskForm({ ...taskForm, deadlineDate: value || today })} allowClear={false} />
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
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="today-grid">
        <main className="today-main">
          {plan ? (
            <section className="section-line plan-section clean-section">
              <div className="section-title-row plan-title-row compact-plan-title-row">
                <h2 className="inline-plan-title">
                  Лист дня
                  <span>выполнено {counts.COMPLETED} · в плане {counts.PENDING} · не выполнено {counts.FAILED}</span>
                  {isClosed ? <HpXpLine xp={plan.xpEarned ?? 0} hp={plan.hpDelta ?? 0} /> : null}
                </h2>
                <div className="plan-progress">
                  <strong>{completedPct}%</strong>
                  <div className="meter"><span style={{ width: `${completedPct}%` }} /></div>
                </div>
              </div>

              <div className="today-inline-toolbar inline-overlay-host" ref={filtersHostRef}>
                <div className="today-controls-row">
                  {!isClosed ? (
                    <Button type="button" onClick={() => setTaskDrawerOpen((value) => !value)} aria-expanded={taskDrawerOpen}>
                      {taskDrawerOpen ? "Скрыть задачу" : "Добавить задачу"}
                    </Button>
                  ) : null}
                  <Button type="button" variant="ghost" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>{filtersOpen ? "Скрыть фильтры" : "Фильтры"}</Button>
                  <Button type="button" variant="ghost" onClick={() => setSortByTime((value) => !value)}>{sortByTime ? "Обычный порядок" : "По времени"}</Button>
                </div>

                {taskDrawerOpen ? (
                  <div className="modal-backdrop form-modal-backdrop" role="presentation" onMouseDown={() => setTaskDrawerOpen(false)}>
                    <form className="form-grid task-form task-drawer unified-form compact-create-form ordered-form centered-task-form modal-form-card" onSubmit={createTask} role="dialog" aria-modal="true" aria-label="Создание задачи" onMouseDown={(event) => event.stopPropagation()}>
                      <div className="modal-form-head">
                        <div><p className="eyebrow">новая задача</p><strong>Добавить задачу</strong></div>
                        <button type="button" className="dialog-close" onClick={() => setTaskDrawerOpen(false)} aria-label="Закрыть">×</button>
                      </div>
                      <Field label="Название">
                        <TextInput value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required maxLength={160} placeholder="Например: подготовить отчёт" />
                      </Field>
                      <Field label="Дата задачи">
                        <DateWheelInput value={taskForm.deadlineDate || today} onChange={(value) => setTaskForm({ ...taskForm, deadlineDate: value || today })} allowClear={false} />
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
                  </div>
                ) : null}

                {filtersOpen ? (
                  <div className="filter-panel drawer-panel toolbar-popover toolbar-popover--filters">
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
              </div>

              {items.length === 0 ? <EmptyState title="Пока пусто" text="Создай задачу или открой нужный квест в календаре." /> : null}
              {items.length > 0 && filteredItems.length === 0 ? <EmptyState title="Ничего не найдено" text="Измени фильтры." /> : null}

              <div className="grouped-plan-list">
                {groupedItems.map((group) => (
                  <section className={`plan-source-group group-${group.source.toLowerCase()}`} key={group.source}>
                    <div className="plan-source-head">
                      <h3>{group.title}</h3>
                      <span>{group.items.length}</span>
                    </div>
                    <div className="line-list todo-list typed-list clean-list">
                      {group.items.map((item) => (
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
                  </section>
                ))}
              </div>

              <div className="bottom-day-actions day-note-actions">
                <Button type="button" variant="ghost" onClick={() => setNoteOpen((value) => !value)}>
                  {noteOpen ? "Скрыть заметку" : plan.note ? "Изменить заметку" : "Заметка"}
                </Button>
                {!isClosed ? <Button variant="danger" onClick={closeDay} disabled={busy}>Закрыть день</Button> : null}
              </div>

              {plan?.note && !noteOpen ? <p className="day-note-preview">{plan.note}</p> : null}

              {noteOpen ? (
                <div className="day-note-editor drawer-panel">
                  <Field label="Заметка о дне">
                    <TextArea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      rows={4}
                      maxLength={5000}
                      placeholder="Что получилось, что не понравилось, что стоит запомнить"
                    />
                  </Field>
                  <div className="form-actions">
                    <Button type="button" disabled={noteSaving} onClick={saveNote}>{noteSaving ? "Сохраняем" : "Сохранить"}</Button>
                  </div>
                </div>
              ) : null}

              {isClosed ? <p className="muted closed-day-note">День закрыт. Изменения уже учтены в streak, HP и XP.</p> : null}
            </section>
          ) : null}
        </main>

        {plan ? (
          <aside className="today-side">
            <section className="section-line character-panel clean-section">
              <Avatar stats={profile?.gameStats} compact variantIndex={1} />
              <GameHud stats={profile?.gameStats} />
            </section>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
