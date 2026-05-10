import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../api/http";
import type {
  CreateTaskRequest,
  DailyPlanItemResponse,
  DailyPlanItemStatus,
  DailyPlanResponse,
  SourceType
} from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { TodayHero } from "../components/today/TodayHero";
import { TodayNoteEditor } from "../components/today/TodayNoteEditor";
import { TodayPlanSummary } from "../components/today/TodayPlanSummary";
import { TodaySidebar } from "../components/today/TodaySidebar";
import { TodayStartPanel } from "../components/today/TodayStartPanel";
import { TodayFocusModal } from "../components/today/TodayFocusModal";
import { TodayFocusWidget } from "../components/today/TodayFocusWidget";
import { TodayTaskCreateModal, type TodayTaskOptions } from "../components/today/TodayTaskCreateModal";
import { TodayToolbar } from "../components/today/TodayToolbar";
import { DailyPlanGroups } from "../components/dailyPlan/DailyPlanGroups";
import { ErrorLine, Loader } from "../components/Loader";
import { useAchievementWatcher } from "../context/AchievementContext";
import { useGame } from "../context/GameContext";
import { useToast } from "../context/ToastContext";
import { useTodayFocusTimer } from "../hooks/useTodayFocusTimer";
import { formatDate, pct, todayISO } from "../utils/format";
import { countDailyPlanItemStatuses, groupDailyPlanItemsBySource, sortDailyPlanItemsByPlannedTime } from "../utils/dailyPlanItems";
import { readBooleanPreference, writeBooleanPreference } from "../utils/planItemUi";
import { formatFocusClockDuration, type FocusCreditedMode } from "../utils/focusTimerStorage";

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


function toLocalDateTimeString(timestamp: number) {
  const date = new Date(timestamp);
  const localTimestamp = timestamp - date.getTimezoneOffset() * 60_000;
  return new Date(localTimestamp).toISOString().slice(0, 19);
}

function toApiCreditedMode(mode: FocusCreditedMode) {
  return mode === "actual" ? "ACTUAL" as const : "PLANNED" as const;
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
  const [taskOptions, setTaskOptions] = useState<TodayTaskOptions>({ deadline: false, time: false, description: false });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [openDescriptionId, setOpenDescriptionId] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(cachedPlan?.note ?? "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [twoColumnLayout, setTwoColumnLayout] = useState(() => readBooleanPreference("flowvisior:today-two-column-layout"));
  const [focusModalOpen, setFocusModalOpen] = useState(false);
  const filtersHostRef = useRef<HTMLDivElement | null>(null);
  const focusCompleteSubmittingRef = useRef(false);
  const focusTimer = useTodayFocusTimer();

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
  const counts = useMemo(() => countDailyPlanItemStatuses(items), [items]);
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
    return sortByTime ? sortDailyPlanItemsByPlannedTime(filtered) : filtered;
  }, [items, search, sourceFilter, statusFilter, sortByTime]);
  const groupedItems = useMemo(() => groupDailyPlanItemsBySource(filteredItems), [filteredItems]);

  function toggleTwoColumnLayout() {
    setTwoColumnLayout((value) => {
      const next = !value;
      writeBooleanPreference("flowvisior:today-two-column-layout", next);
      return next;
    });
  }

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

  function updatePlanItem(itemId: number, updater: (item: DailyPlanItemResponse) => DailyPlanItemResponse) {
    setPlan((current) => {
      if (!current) return current;
      const next = {
        ...current,
        items: current.items.map((entry) => entry.id === itemId ? updater(entry) : entry)
      };
      writeCachedTodayPlan(today, next);
      return next;
    });
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
    const previousCompletedAt = item.completedAt ?? null;
    const action: "complete" | "fail" | "reset" = item.status === "PENDING" ? "complete" : item.status === "COMPLETED" ? "fail" : "reset";
    const nextStatus: DailyPlanItemStatus = action === "complete" ? "COMPLETED" : action === "fail" ? "FAILED" : "PENDING";

    setBusyItemId(item.id);
    updatePlanItem(item.id, (entry) => ({
      ...entry,
      status: nextStatus,
      completedAt: nextStatus === "PENDING" ? null : new Date().toISOString()
    }));

    try {
      await runAction(item, action);
      refreshProfile().catch(() => undefined);
      syncAchievements(false).catch(() => undefined);
      if (item.sourceType === "QUEST") loadPlan(false).catch(() => undefined);
    } catch (err) {
      updatePlanItem(item.id, (entry) => ({ ...entry, status: previous, completedAt: previousCompletedAt }));
      setError(err instanceof Error ? err.message : "Не удалось изменить статус");
    } finally {
      setBusyItemId(null);
    }
  }

  async function completeFocusItem(item: DailyPlanItemResponse, creditedMode: FocusCreditedMode) {
    if (focusCompleteSubmittingRef.current || isClosed || busyItemId === item.id || item.status === "COMPLETED" || focusTimer.timer.savedAt) return;
    const previous = item.status;
    const previousCompletedAt = item.completedAt ?? null;
    const previousFocusSpentSeconds = item.focusSpentSeconds ?? null;
    const creditedDurationSeconds = creditedMode === "actual"
      ? focusTimer.actualElapsedSeconds
      : focusTimer.plannedDurationSeconds;
    const sessionId = focusTimer.timer.sessionId;
    const completedAt = focusTimer.timer.completedAt ?? Date.now();
    const focusSession = sessionId && focusTimer.timer.task ? {
      sessionId,
      sourceType: item.sourceType,
      sourceId: item.sourceId ?? null,
      title: item.title,
      durationSeconds: creditedDurationSeconds,
      plannedDurationSeconds: focusTimer.plannedDurationSeconds,
      actualElapsedSeconds: focusTimer.actualElapsedSeconds,
      overtimeSeconds: focusTimer.overtimeSeconds,
      creditedDurationSeconds,
      creditedMode: toApiCreditedMode(creditedMode),
      completedAt: toLocalDateTimeString(completedAt),
      planDate: today
    } : null;

    focusCompleteSubmittingRef.current = true;
    setBusyItemId(item.id);
    updatePlanItem(item.id, (entry) => ({
      ...entry,
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
      focusSpentSeconds: creditedDurationSeconds
    }));

    try {
      await api.dailyPlanItems.complete(item.id, focusSession ? { focusSession } : undefined);
      if (sessionId) focusTimer.markSaved(sessionId);
      notify({ tone: "success", title: "Задача отмечена выполненной", text: `Засчитано ${formatFocusClockDuration(creditedDurationSeconds)}.` });
      refreshProfile().catch(() => undefined);
      syncAchievements(false).catch(() => undefined);
      if (item.sourceType === "QUEST") loadPlan(false).catch(() => undefined);
    } catch (err) {
      updatePlanItem(item.id, (entry) => ({ ...entry, status: previous, completedAt: previousCompletedAt, focusSpentSeconds: previousFocusSpentSeconds }));
      setError(err instanceof Error ? err.message : "Не удалось отметить задачу выполненной");
    } finally {
      focusCompleteSubmittingRef.current = false;
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
      <TodayHero date={today} status={plan?.status} />

      {loading ? <Loader label="Загружаем день" /> : null}
      <ErrorLine error={error} />

      {!loading && !plan ? <TodayStartPanel busy={busy} stats={profile?.gameStats} onStartDay={startDay} /> : null}

      <div className="today-grid">
        <main className="today-main">
          {plan ? (
            <>
              <section className="section-line plan-section clean-section">
                <TodayPlanSummary
                  counts={counts}
                  completedPct={completedPct}
                  isClosed={isClosed}
                  xpEarned={plan.xpEarned}
                  hpDelta={plan.hpDelta}
                />

                <TodayToolbar
                  isClosed={isClosed}
                  taskDrawerOpen={taskDrawerOpen}
                  filtersOpen={filtersOpen}
                  sortByTime={sortByTime}
                  twoColumnLayout={twoColumnLayout}
                  sourceFilters={sourceFilters}
                  statusFilters={statusFilters}
                  sourceFilter={sourceFilter}
                  statusFilter={statusFilter}
                  search={search}
                  hostRef={filtersHostRef}
                  setTaskDrawerOpen={setTaskDrawerOpen}
                  setFiltersOpen={setFiltersOpen}
                  setSortByTime={setSortByTime}
                  setSourceFilter={setSourceFilter}
                  setStatusFilter={setStatusFilter}
                  setSearch={setSearch}
                  toggleTwoColumnLayout={toggleTwoColumnLayout}
                  onOpenFocus={() => setFocusModalOpen(true)}
                />

                <TodayFocusWidget
                  timer={focusTimer.timer}
                  remainingSeconds={focusTimer.remainingSeconds}
                  overtimeSeconds={focusTimer.overtimeSeconds}
                  onOpen={() => setFocusModalOpen(true)}
                  onPause={focusTimer.pause}
                  onResume={focusTimer.resume}
                />

                {taskDrawerOpen ? (
                  <TodayTaskCreateModal
                    today={today}
                    taskForm={taskForm}
                    taskOptions={taskOptions}
                    taskError={taskError}
                    busy={busy}
                    setTaskForm={setTaskForm}
                    setTaskOptions={setTaskOptions}
                    onSubmit={createTask}
                    onClose={() => setTaskDrawerOpen(false)}
                  />
                ) : null}

                {items.length === 0 ? <EmptyState title="Пока пусто" text="Создай задачу или открой нужный квест в календаре." /> : null}
                {items.length > 0 && filteredItems.length === 0 ? <EmptyState title="Ничего не найдено" text="Измени фильтры." /> : null}

                <DailyPlanGroups
                  groups={groupedItems}
                  twoColumnLayout={twoColumnLayout}
                  canChangeStatus={!isClosed}
                  busyItemId={busyItemId}
                  editingId={editingId}
                  editTitle={editTitle}
                  openDescriptionId={openDescriptionId}
                  setEditTitle={setEditTitle}
                  onCycle={cycleItem}
                  onToggleDescription={(id) => setOpenDescriptionId((current) => current === id ? null : id)}
                  onBeginEdit={beginEdit}
                  onSaveTitle={saveTitle}
                  onTitleKey={handleTitleKey}
                />

                <div className="day-note-in-plan">
                  {plan.note && !noteOpen ? <p className="day-note-preview">{plan.note}</p> : null}
                  {noteOpen ? <TodayNoteEditor noteDraft={noteDraft} noteSaving={noteSaving} setNoteDraft={setNoteDraft} onSave={saveNote} /> : null}
                  {isClosed ? <p className="muted closed-day-note">День закрыт. Изменения уже учтены в streak, HP и XP.</p> : null}
                </div>
              </section>

              <div className="day-plan-external-actions">
                <Button type="button" variant="ghost" onClick={() => setNoteOpen((value) => !value)}>
                  {noteOpen ? "Скрыть заметку" : plan.note ? "Изменить заметку" : "Заметка"}
                </Button>
                {!isClosed ? <Button variant="danger" onClick={closeDay} disabled={busy}>Закрыть день</Button> : null}
              </div>
            </>
          ) : null}

          {focusModalOpen ? (
            <TodayFocusModal
              items={items}
              timer={focusTimer.timer}
              remainingSeconds={focusTimer.remainingSeconds}
              overtimeSeconds={focusTimer.overtimeSeconds}
              plannedDurationSeconds={focusTimer.plannedDurationSeconds}
              actualElapsedSeconds={focusTimer.actualElapsedSeconds}
              canCompleteItem={!isClosed}
              completingItemId={busyItemId}
              onStart={(item, durationMinutes) => {
                if (item.status === "COMPLETED") {
                  notify({ tone: "info", title: "Фокус уже не нужен", text: "Задача уже выполнена." });
                  return;
                }
                focusTimer.start(item, durationMinutes);
              }}
              onPause={focusTimer.pause}
              onResume={focusTimer.resume}
              onReset={focusTimer.reset}
              onChangeCreditedMode={focusTimer.setCreditedMode}
              onCompleteItem={completeFocusItem}
              onClose={() => setFocusModalOpen(false)}
            />
          ) : null}
        </main>

        {plan ? <TodaySidebar stats={profile?.gameStats} /> : null}
      </div>
    </section>
  );
}
