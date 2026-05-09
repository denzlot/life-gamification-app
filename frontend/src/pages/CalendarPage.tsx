import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/http";
import type { CalendarDayResponse, QuestResponse, QuestStepResponse } from "../api/types";
import { CalendarGrid } from "../components/calendar/CalendarGrid";
import { CalendarHeader } from "../components/calendar/CalendarHeader";
import { CalendarQuestSidebar } from "../components/calendar/CalendarQuestSidebar";
import { CalendarToolbar } from "../components/calendar/CalendarToolbar";
import { todayISO } from "../utils/format";
import { overlayCalendarDay, type PlanningCatalog } from "../utils/planningPreview";
import {
  type CalendarDisplayMode,
  computePace,
  dateDiffDays,
  groupQuestSteps,
  shiftedWeekdays
} from "../utils/calendarSchedule";

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [days, setDays] = useState<CalendarDayResponse[]>([]);
  const [quests, setQuests] = useState<QuestResponse[]>([]);
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null);
  const [displayFiltersOpen, setDisplayFiltersOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>("clean");
  const [questSteps, setQuestSteps] = useState<QuestStepResponse[]>([]);
  const [planningCatalog, setPlanningCatalog] = useState<PlanningCatalog>({ tasks: [], habits: [], questSteps: [] });
  const [loading, setLoading] = useState(true);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepsError, setStepsError] = useState<string | null>(null);
  const calendarOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCalendar() {
      setLoading(true);
      setError(null);
      try {
        const [calendarDays, questList, taskList, habitList, allQuestSteps] = await Promise.all([
          api.calendar.month(cursor.getFullYear(), cursor.getMonth() + 1),
          api.quests.list(),
          api.tasks.list(),
          api.habits.list(),
          api.quests.activeSteps()
        ]);

        if (cancelled) return;
        const activeQuests = questList.filter((quest) => quest.status === "ACTIVE");
        setDays(calendarDays);
        setQuests(activeQuests);
        setPlanningCatalog({ tasks: taskList, habits: habitList, questSteps: allQuestSteps });
        setSelectedQuestId((current) => current && activeQuests.some((quest) => quest.id === current) ? current : null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Не удалось загрузить календарь");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCalendar();
    return () => { cancelled = true; };
  }, [cursor]);

  useEffect(() => {
    if (!selectedQuestId) {
      setQuestSteps([]);
      setStepsError(null);
      return;
    }

    let cancelled = false;
    const questId = selectedQuestId;

    function loadSelectedQuestSteps(showLoader = true) {
      if (showLoader) setStepsLoading(true);
      setStepsError(null);
      api.quests
        .steps(questId)
        .then((steps) => {
          if (!cancelled) setQuestSteps(steps);
        })
        .catch((err) => {
          if (!cancelled) {
            setQuestSteps([]);
            setStepsError(err instanceof Error ? err.message : "Не удалось загрузить шаги квеста");
          }
        })
        .finally(() => {
          if (!cancelled && showLoader) setStepsLoading(false);
        });
    }

    loadSelectedQuestSteps(true);

    function refreshOnReturn() {
      if (document.visibilityState === "visible") loadSelectedQuestSteps(false);
    }

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [selectedQuestId]);

  useEffect(() => {
    if (!displayFiltersOpen) return undefined;

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && calendarOverlayRef.current?.contains(target)) return;
      setDisplayFiltersOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [displayFiltersOpen]);

  const cells = useMemo(() => {
    const byDate = new Map(days.map((day) => [day.date, overlayCalendarDay(day, planningCatalog)]));
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, index) => {
      const dayNumber = index + 1;
      const fixedIso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
      const fallback: CalendarDayResponse = {
        date: fixedIso,
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
      return byDate.get(fixedIso) ?? overlayCalendarDay(fallback, planningCatalog);
    });
  }, [cursor, days, planningCatalog]);

  const today = todayISO();
  const weekdayHeader = useMemo(() => shiftedWeekdays(cursor), [cursor]);
  const selectedQuest = useMemo(() => quests.find((quest) => quest.id === selectedQuestId) ?? null, [quests, selectedQuestId]);
  const stepStatsByDate = useMemo(() => groupQuestSteps(questSteps), [questSteps]);
  const pace = useMemo(() => computePace(selectedQuest, questSteps, stepStatsByDate, today), [selectedQuest, questSteps, stepStatsByDate, today]);
  const showWorkload = displayMode === "workload" || displayMode === "full";
  const showRewards = displayMode === "rewards" || displayMode === "full";
  const monthSteps = useMemo(() => {
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    return questSteps.filter((step) => step.scheduledDate.startsWith(monthKey));
  }, [cursor, questSteps]);
  const monthCompleted = monthSteps.filter((step) => step.status === "COMPLETED").length;
  const monthSkipped = monthSteps.filter((step) => step.status === "SKIPPED").length;
  const monthPending = monthSteps.length - monthCompleted - monthSkipped;
  const completedTotal = questSteps.filter((step) => step.status === "COMPLETED").length;
  const nextPending = questSteps
    .filter((step) => step.status === "PENDING")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.stepNumber - b.stepNumber)[0] ?? null;
  const targetDate = selectedQuest?.targetDate ?? null;
  const daysLeft = targetDate ? dateDiffDays(targetDate, today) : null;

  function chooseQuest(id: number | null) {
    setSelectedQuestId((current) => current === id ? null : id);
  }

  return (
    <section className="page calendar-page compact-calendar-page">
      <CalendarHeader cursor={cursor} onCursorChange={setCursor} />

      <div className="calendar-body-layout">
        <section className="section-line calendar-panel stylish-calendar-panel clean-section compact-calendar-shell">
          <CalendarToolbar
            overlayRef={calendarOverlayRef}
            open={displayFiltersOpen}
            displayMode={displayMode}
            onToggleOpen={() => setDisplayFiltersOpen((value) => !value)}
            onDisplayModeChange={setDisplayMode}
          />

          {error ? (
            <div className="calendar-status-layer" aria-live="polite">
              <div className="error-line">{error}</div>
            </div>
          ) : null}

          <CalendarGrid
            cells={cells}
            weekdayHeader={weekdayHeader}
            today={today}
            selectedQuestActive={Boolean(selectedQuest)}
            stepStatsByDate={stepStatsByDate}
            pace={pace}
            showWorkload={showWorkload}
            showRewards={showRewards}
          />
        </section>

        <CalendarQuestSidebar
          loading={loading}
          quests={quests}
          selectedQuest={selectedQuest}
          selectedQuestId={selectedQuestId}
          stepsError={stepsError}
          pace={pace}
          monthSteps={monthSteps}
          monthCompleted={monthCompleted}
          monthPending={monthPending}
          nextPending={nextPending}
          daysLeft={daysLeft}
          completedTotal={completedTotal}
          onChooseQuest={chooseQuest}
        />
      </div>
    </section>
  );
}
