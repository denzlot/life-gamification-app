import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/http";
import type { CalendarDayResponse, CreateTaskRequest, DailyPlanItemResponse, DailyPlanItemStatus, DailyPlanResponse } from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Field, TextArea, TextInput, TimeWheelInput } from "../components/FormFields";
import { ErrorLine, Loader } from "../components/Loader";
import { useAchievementWatcher } from "../context/AchievementContext";
import { useGame } from "../context/GameContext";
import { useToast } from "../context/ToastContext";
import { formatTime, itemStatusLabel, pct, planStatusLabel, signed, sourceLabel, todayISO } from "../utils/format";

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

export function DayDetailsPage() {
  const { date = todayISO() } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { refreshProfile } = useGame();
  const { syncAchievements } = useAchievementWatcher();
  const [summary, setSummary] = useState<CalendarDayResponse | null>(null);
  const [plan, setPlan] = useState<DailyPlanResponse | null>(null);
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

  useEffect(() => {
    setTaskForm({ title: "", description: "", deadlineDate: date, plannedTime: "", deadlineTime: "" });
    setTaskOptions({ deadline: false, time: false, description: false });
  }, [date]);

  const load = useCallback(async (showLoader = true) => {
    const [year, month] = date.split("-").map(Number);
    if (showLoader) {
      setLoading(true);
      setError(null);
    }
    try {
      const [calendar, dayPlan] = await Promise.all([
        api.calendar.month(year, month),
        api.dailyPlans.byDate(date).catch((err) => {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        })
      ]);
      setSummary(calendar.find((day) => day.date === date) ?? null);
      setPlan(dayPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть день");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const items = plan?.items ?? [];
  const visibleItems = useMemo(() => sortByTime ? sortByPlannedTime(items) : items, [items, sortByTime]);
  const counts = useMemo(() => countStatuses(items), [items]);
  const completedPct = pct(counts.COMPLETED, items.length);
  const isClosed = plan?.status === "CLOSED";
  const isFuture = date > todayISO();

  async function startDay() {
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.startByDate(date);
      setPlan(next);
      notify({ tone: "success", title: "День открыт" });
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть день");
    } finally {
      setBusy(false);
    }
  }

  async function reopenDay() {
    if (!window.confirm("Открыть закрытый день? После 03:00 следующего дня на это тратится щит.")) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.reopenByDate(date);
      setPlan(next);
      notify({ tone: "success", title: "День снова открыт" });
      refreshProfile().catch(() => undefined);
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть день заново");
    } finally {
      setBusy(false);
    }
  }

  async function closeDay() {
    if (!window.confirm("Закрыть этот день?")) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.dailyPlans.closeByDate(date);
      setPlan(next);
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
      deadlineDate: date,
      plannedTime: taskForm.plannedTime || null,
      deadlineTime: taskForm.deadlineTime || null
    };
    try {
      await api.tasks.create(payload);
      setTaskForm({ title: "", description: "", deadlineDate: date, plannedTime: "", deadlineTime: "" });
      setTaskOptions({ deadline: false, time: false, description: false });
      setTaskDrawerOpen(false);
      notify({ tone: "success", title: "Задача создана" });
      await load(false);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Не удалось создать задачу");
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
    if (!plan || isClosed || isFuture || busyItemId === item.id) return;
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
        <h1>{monthDayLabel(date)}</h1>
        <div className="day-status-row">
          <span>{plan ? planStatusLabel(plan.status) : summary?.status === "EMPTY" ? "день не открыт" : planStatusLabel(summary?.status)}</span>
          {plan ? <b>{counts.COMPLETED} / {items.length}</b> : null}
        </div>
        <nav className="day-switcher" aria-label="Переключение дней">
          <button type="button" onClick={() => navigate(`/calendar/${addDays(date, -1)}`)}>← предыдущий</button>
          <Link to="/calendar">календарь</Link>
          <button type="button" onClick={() => navigate(`/calendar/${addDays(date, 1)}`)}>следующий →</button>
        </nav>
      </header>

      {loading ? <Loader label="Открываем день" /> : <ErrorLine error={error} />}

      {!loading && !plan ? (
        <section className="section-line start-day-line clean-section">
          <h2>День не открыт</h2>
          <Button onClick={startDay} disabled={busy}>{busy ? "Открываем" : "Открыть день"}</Button>
        </section>
      ) : null}

      {plan && !isClosed ? (
        <section className="section-line task-create-panel drawer-host clean-section">
          <div className="section-title-row small-title-row">
            <h2>Добавить задачу</h2>
            <Button type="button" variant="ghost" onClick={() => setTaskDrawerOpen((value) => !value)}>{taskDrawerOpen ? "Скрыть" : "Добавить задачу"}</Button>
          </div>
          {taskDrawerOpen ? (
            <form className="form-grid task-drawer unified-form compact-create-form" onSubmit={createTask}>
              <Field label="Название">
                <TextInput value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required maxLength={160} placeholder="Например: созвон с дизайнером" />
              </Field>
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
          ) : null}
        </section>
      ) : null}

      {summary || plan ? (
        <section className="section-line clean-section">
          <div className="section-title-row plan-title-row">
            <h2>Лист дня</h2>
            <div className="plan-progress"><strong>{completedPct}%</strong><div className="meter"><span style={{ width: `${completedPct}%` }} /></div></div>
          </div>
          <div className="summary-strip day-summary compact-strip">
            <span>выполнено {plan ? counts.COMPLETED : summary?.completedCount ?? 0}/{plan ? items.length : summary?.totalCount ?? 0}</span>
            <span>в плане {counts.PENDING}</span>
            <span>не выполнено {counts.FAILED}</span>
            <span className="xp-token">XP {signed(plan?.xpEarned ?? summary?.xpEarned ?? 0)}</span>
            <span className="hp-token">HP {signed(plan?.hpDelta ?? summary?.hpDelta ?? 0)}</span>
          </div>
          {isFuture ? <p className="muted inline-note">Будущий день можно планировать. Отмечать выполнение можно только в сам день.</p> : null}
          {items.length > 1 ? <div className="today-controls-row"><Button type="button" variant="ghost" onClick={() => setSortByTime((value) => !value)}>{sortByTime ? "Обычный порядок" : "Сортировать по времени"}</Button></div> : null}

          {items.length > 0 ? (
            <div className="line-list todo-list details-list typed-list clean-list">
              {visibleItems.map((item) => (
                <article className={`line-item plan-item status-${item.status.toLowerCase()}`} key={item.id}>
                  <button
                    type="button"
                    className={`status-cycle status-cycle-${item.status.toLowerCase()}`}
                    disabled={busyItemId === item.id || isClosed || !canConfirm(date)}
                    onClick={() => cycleItem(item)}
                    aria-label={`${cycleLabel(item.status)}: ${item.title}`}
                  />
                  {item.description ? <button type="button" className={`description-toggle ${openDescriptionId === item.id ? "open" : ""}`} onClick={() => setOpenDescriptionId((current) => current === item.id ? null : item.id)} aria-label="Показать описание">›</button> : <span className="description-spacer" />}
                  <div className="todo-main">
                    {editingId === item.id ? (
                      <TextInput autoFocus value={editTitle} onChange={(event) => setEditTitle(event.target.value)} onBlur={() => saveTitle(item)} onKeyDown={(event) => handleTitleKey(event, item)} />
                    ) : (
                      <strong className="editable-title" onClick={() => beginEdit(item)}>{item.title}</strong>
                    )}
                    <p className="muted compact-meta">{itemStatusLabel(item.status)}{item.plannedTime ? ` · ${formatTime(item.plannedTime)}` : ""}{item.deadlineTime ? ` · дедлайн ${formatTime(item.deadlineTime)}` : ""}</p>
                    {openDescriptionId === item.id && item.description ? <p className="item-description">{item.description}</p> : null}
                  </div>
                  <span className="item-type-badge">{sourceLabel(item.sourceType).toLowerCase()}</span>
                </article>
              ))}
            </div>
          ) : null}

          {!loading && !plan ? <EmptyState title="День ещё не открыт" text="Открой день, чтобы добавить задачи и увидеть привычки." /> : null}
          {!loading && plan && items.length === 0 ? <EmptyState title="Пока пусто" text="Создай задачу или настрой привычки и квесты." /> : null}
          {plan && isClosed ? <div className="bottom-day-actions"><Button onClick={reopenDay} disabled={busy}>Открыть заново</Button></div> : null}
          {plan && !isClosed && !isFuture ? <div className="bottom-day-actions"><Button variant="danger" onClick={closeDay} disabled={busy}>Закрыть день</Button></div> : null}
        </section>
      ) : null}
    </section>
  );
}
