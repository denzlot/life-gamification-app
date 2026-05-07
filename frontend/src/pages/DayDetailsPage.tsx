import { FormEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/http";
import type { CalendarDayResponse, CreateTaskRequest, DailyPlanItemResponse, DailyPlanItemStatus, DailyPlanResponse, SourceType } from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { DateWheelInput, Field, TextArea, TextInput, TimeWheelInput } from "../components/FormFields";
import { ErrorLine, Loader } from "../components/Loader";
import { useAchievementWatcher } from "../context/AchievementContext";
import { useGame } from "../context/GameContext";
import { useToast } from "../context/ToastContext";
import { formatDate, formatTime, itemStatusLabel, pct, planStatusLabel, signed, sourceLabel, todayISO } from "../utils/format";
import { buildPreviewItems, summarizePreviewItems } from "../utils/planningPreview";



function planItemOrderKey(date: string) {
  return `flowvisior:plan-item-order:${date}`;
}

function readPlanItemOrder(date: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(planItemOrderKey(date));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is number => typeof value === "number") : [];
  } catch {
    return [];
  }
}

function writePlanItemOrder(date: string, items: DailyPlanItemResponse[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(planItemOrderKey(date), JSON.stringify(items.map((item) => item.id)));
  } catch {
    // Manual ordering is a UI preference; ignore storage limits/private mode.
  }
}

function applyPlanItemOrder(items: DailyPlanItemResponse[], date: string) {
  const order = readPlanItemOrder(date);
  if (order.length === 0) return items;
  const orderIndex = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const left = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const right = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}

function reorderItems(items: DailyPlanItemResponse[], activeId: number, overId: number) {
  const from = items.findIndex((item) => item.id === activeId);
  const to = items.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}


function capturePlanItemRects() {
  if (typeof document === "undefined") return new Map<number, DOMRect>();
  const rects = new Map<number, DOMRect>();
  document.querySelectorAll<HTMLElement>("[data-plan-item-id]").forEach((element) => {
    const id = Number(element.dataset.planItemId);
    if (Number.isFinite(id)) rects.set(id, element.getBoundingClientRect());
  });
  return rects;
}

function animatePlanItemShift(previousRects: Map<number, DOMRect>) {
  if (typeof document === "undefined" || previousRects.size === 0) return;
  window.requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>("[data-plan-item-id]").forEach((element) => {
      const id = Number(element.dataset.planItemId);
      const previous = previousRects.get(id);
      if (!previous) return;
      const next = element.getBoundingClientRect();
      const deltaX = previous.left - next.left;
      const deltaY = previous.top - next.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
      element.animate(
        [{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: "translate(0, 0)" }],
        { duration: 190, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    });
  });
}

function readBooleanPreference(key: string, fallback = false) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) === "1";
}

function writeBooleanPreference(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // UI preference only.
  }
}

function emptyCalendarDay(date: string): CalendarDayResponse {
  return {
    date,
    status: "EMPTY",
    completedCount: 0,
    totalCount: 0,
    taskCount: 0,
    habitCount: 0,
    questCount: 0,
    taskCompletedCount: 0,
    habitCompletedCount: 0,
    questCompletedCount: 0,
    xpEarned: 0,
    hpDelta: 0,
    streakDay: 0,
    shieldUsed: false
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

function canConfirm(date: string) {
  return date <= todayISO();
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
  if (completedCount > 0) return "Закрыть этот день?";
  return "В этом дне пока нет выполненных задач. Если закрыть его сейчас, персонаж потеряет HP. Закрыть день?";
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

export function DayDetailsPage() {
  const { date = todayISO() } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { refreshProfile } = useGame();
  const { syncAchievements } = useAchievementWatcher();
  const [summary, setSummary] = useState<CalendarDayResponse | null>(null);
  const [plan, setPlan] = useState<DailyPlanResponse | null>(null);
  const [previewItems, setPreviewItems] = useState<DailyPlanItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<CreateTaskRequest>({ title: "", description: "", deadlineDate: date, plannedTime: "", deadlineTime: "" });
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [taskOptions, setTaskOptions] = useState({ deadline: false, time: false, description: false });
  const [sortByTime, setSortByTime] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [openDescriptionId, setOpenDescriptionId] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null);
  const [twoColumnLayout, setTwoColumnLayout] = useState(() => readBooleanPreference("flowvisior:details-two-column-layout"));
  const activeDragItemIdRef = useRef<number | null>(null);
  const lastDragOverIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (date === todayISO()) {
      navigate("/today", { replace: true });
      return;
    }
    setTaskForm({ title: "", description: "", deadlineDate: date, plannedTime: "", deadlineTime: "" });
    setTaskOptions({ deadline: false, time: false, description: false });
  }, [date, navigate]);

  const load = useCallback(async (showLoader = true) => {
    const [year, month] = date.split("-").map(Number);
    if (showLoader) {
      setLoading(true);
      setError(null);
    }
    try {
      const [calendar, dayPlan, taskList, habitList, questSteps] = await Promise.all([
        api.calendar.month(year, month),
        api.dailyPlans.byDate(date).catch((err) => {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        }),
        api.tasks.list(),
        api.habits.list(),
        api.quests.activeSteps()
      ]);
      const orderedDayPlan = dayPlan ? { ...dayPlan, items: applyPlanItemOrder(dayPlan.items, date) } : null;
      const preview = orderedDayPlan ? [] : buildPreviewItems(date, { tasks: taskList, habits: habitList, questSteps });
      const previewStats = summarizePreviewItems(preview);
      const calendarSummary = calendar.find((day) => day.date === date) ?? emptyCalendarDay(date);

      setSummary(!dayPlan && previewStats.totalCount > 0 ? {
        ...calendarSummary,
        status: calendarSummary.status === "EMPTY" ? "PLANNED" : calendarSummary.status,
        completedCount: previewStats.completedCount,
        totalCount: previewStats.totalCount,
        taskCount: previewStats.taskCount,
        habitCount: previewStats.habitCount,
        questCount: previewStats.questCount,
        taskCompletedCount: previewStats.taskCompletedCount,
        habitCompletedCount: previewStats.habitCompletedCount,
        questCompletedCount: previewStats.questCompletedCount
      } : calendarSummary);
      setPreviewItems(preview);
      setPlan(orderedDayPlan);
      setNoteDraft(orderedDayPlan?.note ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть день");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const items = plan?.items ?? previewItems;
  const visibleItems = useMemo(() => sortByTime ? sortByPlannedTime(items) : items, [items, sortByTime]);
  const groupedItems = useMemo(() => groupedBySource(visibleItems), [visibleItems]);
  const counts = useMemo(() => countStatuses(items), [items]);
  const completedPct = pct(counts.COMPLETED, items.length);
  const isClosed = plan?.status === "CLOSED";
  const today = todayISO();
  const isPast = date < today;
  const isFuture = date > today;
  const canManualReorder = Boolean(plan && !isClosed && !isPast && !isFuture && !sortByTime);

  function movePlanItem(activeId: number, overId: number) {
    if (!canManualReorder) return;
    const previousRects = capturePlanItemRects();
    setPlan((current) => {
      if (!current) return current;
      const nextItems = reorderItems(current.items, activeId, overId);
      if (nextItems === current.items) return current;
      writePlanItemOrder(date, nextItems);
      return { ...current, items: nextItems };
    });
    animatePlanItemShift(previousRects);
  }

  function handleDragPointerDown(event: ReactPointerEvent<HTMLElement>, itemId: number) {
    if (!canManualReorder) return;
    event.preventDefault();
    activeDragItemIdRef.current = itemId;
    lastDragOverIdRef.current = itemId;
    setDraggingItemId(itemId);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleDragPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const activeId = activeDragItemIdRef.current;
    if (!canManualReorder || activeId === null) return;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const itemElement = target?.closest<HTMLElement>("[data-plan-item-id]");
    const overId = Number(itemElement?.dataset.planItemId);
    if (!Number.isFinite(overId) || overId === activeId || overId === lastDragOverIdRef.current) return;
    lastDragOverIdRef.current = overId;
    movePlanItem(activeId, overId);
  }

  function handleDragPointerEnd(event?: ReactPointerEvent<HTMLElement>) {
    if (event && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    activeDragItemIdRef.current = null;
    lastDragOverIdRef.current = null;
    setDraggingItemId(null);
  }

  function toggleTwoColumnLayout() {
    setTwoColumnLayout((value) => {
      const next = !value;
      writeBooleanPreference("flowvisior:details-two-column-layout", next);
      return next;
    });
  }

  async function startDay() {
    if (isPast) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.startByDate(date);
      const orderedNext = { ...next, items: applyPlanItemOrder(next.items, date) };
      setPlan(orderedNext);
      setNoteDraft(orderedNext.note ?? "");
      notify({ tone: "success", title: "День открыт" });
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть день");
    } finally {
      setBusy(false);
    }
  }

  async function closeDay() {
    if (!window.confirm(closeDayQuestion(counts.COMPLETED))) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.closeByDate(date);
      const orderedNext = { ...next, items: applyPlanItemOrder(next.items, date) };
      setPlan(orderedNext);
      setNoteDraft(orderedNext.note ?? "");
      notify({ tone: "success", title: "День закрыт" });
      refreshProfile().catch(() => undefined);
      syncAchievements(false).catch(() => undefined);
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось закрыть день");
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
      deadlineDate: taskForm.deadlineDate || date,
      plannedTime: taskForm.plannedTime || null,
      deadlineTime: taskForm.deadlineTime || null
    };
    try {
      await api.tasks.create(payload);
      setTaskForm({ title: "", description: "", deadlineDate: date, plannedTime: "", deadlineTime: "" });
      setTaskOptions({ deadline: false, time: false, description: false });
      setTaskDrawerOpen(false);
      notify({ tone: "success", title: taskForm.deadlineDate === date ? "Задача создана" : `Задача создана на ${formatDate(taskForm.deadlineDate || date)}` });
      await load(false);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Не удалось создать задачу");
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    setNoteSaving(true);
    setError(null);
    try {
      const next = await api.dailyPlans.updateNoteByDate(date, { note: noteDraft.trim() || null });
      const orderedNext = { ...next, items: applyPlanItemOrder(next.items, date) };
      setPlan(orderedNext);
      setNoteDraft(orderedNext.note ?? "");
      notify({ tone: "success", title: "Заметка сохранена" });
      setNoteOpen(false);
      await load(false);
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
    if (!plan || isClosed || isPast || isFuture || busyItemId === item.id) return;
    const previous = item.status;
    const action: "complete" | "fail" | "reset" = item.status === "PENDING" ? "complete" : item.status === "COMPLETED" ? "fail" : "reset";
    const nextStatus: DailyPlanItemStatus = action === "complete" ? "COMPLETED" : action === "fail" ? "FAILED" : "PENDING";

    setBusyItemId(item.id);
    setPlan((current) => current ? {
      ...current,
      items: current.items.map((entry) => entry.id === item.id ? { ...entry, status: nextStatus } : entry)
    } : current);

    try {
      await runAction(item, action);
      refreshProfile().catch(() => undefined);
      syncAchievements(false).catch(() => undefined);
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

  function beginEdit(item: DailyPlanItemResponse) {
    if (!plan || isClosed || isPast) return;
    setEditingId(item.id);
    setEditTitle(item.title);
  }

  async function saveTitle(item: DailyPlanItemResponse) {
    const title = editTitle.trim();
    if (!title || title === item.title) {
      setEditingId(null);
      return;
    }
    setPlan((current) => current ? {
      ...current,
      items: current.items.map((entry) => entry.id === item.id ? { ...entry, title } : entry)
    } : current);
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
      load(false).catch(() => undefined);
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
    <section className="page narrow-page day-screen-page centered-page">
      <header className="day-hero">
        <p className="eyebrow">{weekdayLabel(date)}</p>
        <div className="date-inline-switcher day-date-inline" aria-label="Переключение дней">
          <button type="button" className="nav-text-button" onClick={() => { const target = addDays(date, -1); navigate(target === today ? "/today" : `/calendar/${target}`); }} aria-label="Предыдущий день">← предыдущий</button>
          <h1>{monthDayLabel(date)}</h1>
          <button type="button" className="nav-text-button" onClick={() => { const target = addDays(date, 1); navigate(target === today ? "/today" : `/calendar/${target}`); }} aria-label="Следующий день">следующий →</button>
        </div>
        <div className="day-status-row">
          <span>{plan ? planStatusLabel(plan.status) : summary?.status === "EMPTY" ? "день не открыт" : planStatusLabel(summary?.status)}</span>
          <Link className="day-calendar-link" to="/calendar">календарь</Link>
        </div>
      </header>

      {loading ? <Loader label="Открываем день" /> : <ErrorLine error={error} />}

      {!loading && !plan && !isPast && !isFuture ? (
        <section className="section-line start-day-line clean-section center-open-day-panel">
          <Button onClick={startDay} disabled={busy}>{busy ? "Открываем" : "Открыть день"}</Button>
        </section>
      ) : null}

      {!loading && !plan && isPast ? (
        <section className="section-line start-day-line clean-section read-only-day-note">
          <p className="muted">Прошедший день доступен только для просмотра задач. Заметки можно менять у уже созданных дней.</p>
        </section>
      ) : null}

      {!isClosed && !isPast ? (
        <section className="section-line task-create-panel drawer-host clean-section">
          <div className="section-title-row small-title-row">
            <h2>{isFuture ? "Добавить задачу на этот день" : "Добавить задачу"}</h2>
            <Button type="button" variant="ghost" onClick={() => setTaskDrawerOpen((value) => !value)}>{taskDrawerOpen ? "Скрыть" : "Добавить задачу"}</Button>
          </div>
          {taskDrawerOpen ? (
            <div className="modal-backdrop form-modal-backdrop" role="presentation" onMouseDown={() => setTaskDrawerOpen(false)}>
              <form className="form-grid task-drawer unified-form compact-create-form modal-form-card" onSubmit={createTask} role="dialog" aria-modal="true" aria-label="Создание задачи" onMouseDown={(event) => event.stopPropagation()}>
                <div className="modal-form-head">
                  <div><p className="eyebrow">новая задача</p><strong>{isFuture ? "Задача на выбранный день" : "Добавить задачу"}</strong></div>
                  <button type="button" className="dialog-close" onClick={() => setTaskDrawerOpen(false)} aria-label="Закрыть">×</button>
                </div>
              <Field label="Название">
                <TextInput value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required maxLength={160} placeholder="Например: созвон с дизайнером" />
              </Field>
              <div className="fixed-date-chip" aria-label={`Дата задачи: ${formatDate(date)}`}>Дата: {formatDate(date)}</div>
              <div className="optional-toolbar">
                <OptionButton active={taskOptions.time || Boolean(taskForm.plannedTime)} onClick={() => setTaskOptions((state) => ({ ...state, time: !state.time }))}>{taskForm.plannedTime ? `Время: ${formatTime(taskForm.plannedTime)}` : "Время"}</OptionButton>
                <OptionButton active={taskOptions.deadline || Boolean(taskForm.deadlineTime)} onClick={() => setTaskOptions((state) => ({ ...state, deadline: !state.deadline }))}>{taskForm.deadlineTime ? `Дедлайн: ${formatTime(taskForm.deadlineTime)}` : "Дедлайн"}</OptionButton>
                <OptionButton active={taskOptions.description || Boolean(taskForm.description)} onClick={() => setTaskOptions((state) => ({ ...state, description: !state.description }))}>Описание</OptionButton>
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

      {summary || plan ? (
        <section className="section-line clean-section">
          <div className="section-title-row plan-title-row compact-plan-title-row">
            <h2 className="inline-plan-title">
              Лист дня
              <span>выполнено {counts.COMPLETED} · в плане {counts.PENDING} · не выполнено {counts.FAILED}</span>
              {(plan || summary) ? <span className="inline-rewards"><span className="xp-token">XP {signed(plan?.xpEarned ?? summary?.xpEarned ?? 0)}</span><span className="hp-token">HP {signed(plan?.hpDelta ?? summary?.hpDelta ?? 0)}</span></span> : null}
            </h2>
            <div className="plan-progress"><strong>{completedPct}%</strong><div className="meter"><span style={{ width: `${completedPct}%` }} /></div></div>
          </div>
          {isPast ? <p className="muted inline-note">Прошедший день открыт только для просмотра задач. Заметку можно обновить.</p> : null}
          {items.length > 1 ? (
            <div className="today-controls-row">
              <Button type="button" variant="ghost" onClick={() => setSortByTime((value) => !value)}>{sortByTime ? "Обычный порядок" : "Сортировать по времени"}</Button>
              <Button type="button" variant="ghost" className={twoColumnLayout ? "toolbar-active" : ""} onClick={toggleTwoColumnLayout}>{twoColumnLayout ? "В один ряд" : "В два ряда"}</Button>
            </div>
          ) : null}

          {items.length > 0 ? (
            <div className={`grouped-plan-list details-list ${twoColumnLayout ? "two-column-enabled" : ""}`}>
              {groupedItems.map((group) => (
                <section className={`plan-source-group group-${group.source.toLowerCase()}`} key={group.source}>
                  <div className="plan-source-head">
                    <h3>{group.title}</h3>
                    <span>{group.items.length}</span>
                  </div>
                  <div className="line-list todo-list typed-list clean-list">
                    {group.items.map((item) => (
                      <article
                        className={`line-item plan-item draggable-plan-item status-${item.status.toLowerCase()} ${draggingItemId === item.id ? "dragging" : ""}`}
                        key={item.id}
                        data-plan-item-id={item.id}
                      >
                        <span
                          className="drag-handle"
                          role="button"
                          tabIndex={canManualReorder ? 0 : -1}
                          aria-disabled={!canManualReorder}
                          onPointerDown={(event) => handleDragPointerDown(event, item.id)}
                          onPointerMove={handleDragPointerMove}
                          onPointerUp={handleDragPointerEnd}
                          onPointerCancel={handleDragPointerEnd}
                          title={canManualReorder ? "Перетащить пункт" : "Ручной порядок доступен только для открытого дня без сортировки по времени"}
                          aria-label="Перетащить пункт"
                        >
                          ⋮⋮
                        </span>
                        <button
                          type="button"
                          className={`status-cycle status-cycle-${item.status.toLowerCase()}`}
                          disabled={!plan || busyItemId === item.id || isClosed || isPast || !canConfirm(date)}
                          onClick={() => cycleItem(item)}
                          aria-label={`${cycleLabel(item.status)}: ${item.title}`}
                        >
                          <StatusIcon status={item.status} />
                        </button>
                        {item.description ? <button type="button" className={`description-toggle ${openDescriptionId === item.id ? "open" : ""}`} onClick={() => setOpenDescriptionId((current) => current === item.id ? null : item.id)} aria-label="Показать описание">›</button> : <span className="description-spacer" />}
                        <div className="todo-main">
                          <div className="item-title-line">
                            {editingId === item.id ? (
                              <TextInput className="inline-edit-input" autoFocus value={editTitle} onChange={(event) => setEditTitle(event.target.value)} onBlur={() => saveTitle(item)} onKeyDown={(event) => handleTitleKey(event, item)} />
                            ) : (
                              <strong className="editable-title" onClick={() => beginEdit(item)}>{item.title}</strong>
                            )}
                            <span className="item-type-badge">{sourceLabel(item.sourceType).toLowerCase()}</span>
                          </div>
                          <p className="muted compact-meta">{itemStatusLabel(item.status)}{item.plannedTime ? ` · ${formatTime(item.plannedTime)}` : ""}{item.deadlineTime ? ` · дедлайн ${formatTime(item.deadlineTime)}` : ""}</p>
                          {openDescriptionId === item.id && item.description ? <p className="item-description">{item.description}</p> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}

          {!loading && !plan && items.length === 0 ? <EmptyState title="На этот день пока ничего не назначено" text="Добавь задачу или распредели шаг квеста на эту дату." /> : null}
          {!loading && plan && items.length === 0 ? <EmptyState title="Пока пусто" text="Создай задачу или настрой привычки и квесты." /> : null}

          <div className="bottom-day-actions day-note-actions">
            <Button type="button" variant="ghost" onClick={() => setNoteOpen((value) => !value)}>
              {noteOpen ? "Скрыть заметку" : plan?.note ? "Изменить заметку" : "Заметка"}
            </Button>
            {plan && !isClosed && !isPast && !isFuture ? <Button variant="danger" onClick={closeDay} disabled={busy}>Закрыть день</Button> : null}
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

          {plan && isClosed ? <p className="muted closed-day-note">День закрыт. Изменения уже учтены в streak, HP и XP.</p> : null}
        </section>
      ) : null}
    </section>
  );
}
