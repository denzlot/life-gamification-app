import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/http";
import type { CalendarDayResponse, CreateTaskRequest, DailyPlanItemResponse, DailyPlanItemStatus, DailyPlanResponse } from "../api/types";
import { Button } from "../components/Button";
import { DayDetailsHero } from "../components/dayDetails/DayDetailsHero";
import { DayPlanSection } from "../components/dayDetails/DayPlanSection";
import { DayTaskCreatePanel } from "../components/dayDetails/DayTaskCreatePanel";
import { ErrorLine, Loader } from "../components/Loader";
import { useAchievementWatcher } from "../context/AchievementContext";
import { useGame } from "../context/GameContext";
import { useToast } from "../context/ToastContext";
import { countDailyPlanItemStatuses, groupDailyPlanItemsBySource, sortDailyPlanItemsByPlannedTime } from "../utils/dailyPlanItems";
import { formatDate, pct, todayISO } from "../utils/format";
import { readBooleanPreference, writeBooleanPreference } from "../utils/planItemUi";
import { buildPreviewItems, summarizePreviewItems } from "../utils/planningPreview";

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

function closeDayQuestion(completedCount: number) {
  if (completedCount > 0) return "Закрыть этот день?";
  return "В этом дне пока нет выполненных задач. Если закрыть его сейчас, персонаж потеряет HP. Закрыть день?";
}

function createEmptyTaskForm(date: string): CreateTaskRequest {
  return { title: "", description: "", deadlineDate: date, plannedTime: "", deadlineTime: "" };
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
  const [taskForm, setTaskForm] = useState<CreateTaskRequest>(() => createEmptyTaskForm(date));
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
  const [twoColumnLayout, setTwoColumnLayout] = useState(() => readBooleanPreference("flowvisior:details-two-column-layout"));

  useEffect(() => {
    if (date === todayISO()) {
      navigate("/today", { replace: true });
      return;
    }
    setTaskForm(createEmptyTaskForm(date));
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
      const preview = dayPlan ? [] : buildPreviewItems(date, { tasks: taskList, habits: habitList, questSteps });
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
      setPlan(dayPlan);
      setNoteDraft(dayPlan?.note ?? "");
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
  const visibleItems = useMemo(() => sortByTime ? sortDailyPlanItemsByPlannedTime(items) : items, [items, sortByTime]);
  const groupedItems = useMemo(() => groupDailyPlanItemsBySource(visibleItems), [visibleItems]);
  const counts = useMemo(() => countDailyPlanItemStatuses(items), [items]);
  const completedPct = pct(counts.COMPLETED, items.length);
  const isClosed = plan?.status === "CLOSED";
  const today = todayISO();
  const isPast = date < today;
  const isFuture = date > today;

  function navigateToDate(targetDate: string) {
    navigate(targetDate === today ? "/today" : `/calendar/${targetDate}`);
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
      setPlan(next);
      setNoteDraft(next.note ?? "");
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
      setPlan(next);
      setNoteDraft(next.note ?? "");
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
      setTaskForm(createEmptyTaskForm(date));
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
      setPlan(next);
      setNoteDraft(next.note ?? "");
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
      <DayDetailsHero date={date} plan={plan} summary={summary} onNavigateDate={navigateToDate} />

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
        <DayTaskCreatePanel
          date={date}
          isFuture={isFuture}
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          taskOptions={taskOptions}
          setTaskOptions={setTaskOptions}
          taskDrawerOpen={taskDrawerOpen}
          setTaskDrawerOpen={setTaskDrawerOpen}
          taskError={taskError}
          busy={busy}
          onSubmit={createTask}
        />
      ) : null}

      {summary || plan ? (
        <DayPlanSection
          summary={summary}
          plan={plan}
          items={items}
          groups={groupedItems}
          counts={counts}
          completedPct={completedPct}
          loading={loading}
          isPast={isPast}
          isFuture={isFuture}
          isClosed={isClosed}
          sortByTime={sortByTime}
          twoColumnLayout={twoColumnLayout}
          noteOpen={noteOpen}
          noteDraft={noteDraft}
          noteSaving={noteSaving}
          busy={busy}
          busyItemId={busyItemId}
          editingId={editingId}
          editTitle={editTitle}
          openDescriptionId={openDescriptionId}
          setSortByTime={setSortByTime}
          toggleTwoColumnLayout={toggleTwoColumnLayout}
          setNoteOpen={setNoteOpen}
          setNoteDraft={setNoteDraft}
          setEditTitle={setEditTitle}
          onCloseDay={closeDay}
          onSaveNote={saveNote}
          onCycle={cycleItem}
          onToggleDescription={(id) => setOpenDescriptionId((current) => current === id ? null : id)}
          onBeginEdit={beginEdit}
          onSaveTitle={saveTitle}
          onTitleKey={handleTitleKey}
        />
      ) : null}
    </section>
  );
}
