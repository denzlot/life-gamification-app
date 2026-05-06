import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import type { CalendarDayResponse, QuestResponse, QuestStepResponse } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { ErrorLine, Loader } from "../components/Loader";
import { monthLabel, planStatusLabel, signed, todayISO } from "../utils/format";
import { overlayCalendarDay, type PlanningCatalog } from "../utils/planningPreview";

const weekdays = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

type CalendarDisplayMode = "clean" | "workload" | "rewards" | "full";

function shiftedWeekdays(cursor: Date) {
  const firstDayIndex = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, index) => weekdays[(firstDayIndex + index) % 7]);
}

interface QuestDayStats {
  total: number;
  completed: number;
  skipped: number;
  pending: number;
}

interface PaceInfo {
  tone: "behind" | "ahead" | "even";
  behind: number;
  ahead: number;
  expectedToday: number;
  needDate: string | null;
  needCount: number;
}

function addMonths(date: Date, diff: number) {
  return new Date(date.getFullYear(), date.getMonth() + diff, 1);
}

function addDays(date: string, delta: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + delta);
  return next.toISOString().slice(0, 10);
}

function pastClosedStatus(day: CalendarDayResponse, today: string) {
  if (day.date >= today || day.status === "EMPTY") return "";
  if (day.status === "CLOSED") return "закрыт";
  return planStatusLabel(day.status).toLowerCase();
}

function shortStepWord(count: number) {
  const abs = Math.abs(count);
  if (abs % 10 === 1 && abs % 100 !== 11) return "шаг";
  if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) return "шага";
  return "шагов";
}

function questDayLabel(total: number, completed: number, dayDate: string, today: string) {
  if (total === 0) return "";
  if (dayDate < today) return `${completed}/${total}`;
  return `${total} ${shortStepWord(total)}`;
}

function CalendarWorkload({ day }: { day: CalendarDayResponse }) {
  const pending = Math.max(0, day.totalCount - day.completedCount);
  return (
    <span className="workload-mini-blocks" aria-label={`Нагрузка: всего ${day.totalCount}, выполнено ${day.completedCount}, в плане ${pending}`}>
      <span className="workload-row workload-count-row">
        <span className="workload-chip done"><i>✓</i>{day.completedCount}</span>
        <span className="workload-chip pending"><i>−</i>{pending}</span>
        <span className="workload-chip total"><i>•</i>{day.totalCount}</span>
      </span>
    </span>
  );
}

function groupQuestSteps(steps: QuestStepResponse[]) {
  return steps.reduce<Record<string, QuestDayStats>>((acc, step) => {
    const entry = acc[step.scheduledDate] ?? { total: 0, completed: 0, skipped: 0, pending: 0 };
    entry.total += 1;
    if (step.status === "COMPLETED") entry.completed += 1;
    else if (step.status === "SKIPPED") entry.skipped += 1;
    else entry.pending += 1;
    acc[step.scheduledDate] = entry;
    return acc;
  }, {});
}

function dateDiffDays(left: string, right: string) {
  const a = new Date(`${left}T12:00:00`).getTime();
  const b = new Date(`${right}T12:00:00`).getTime();
  return Math.round((a - b) / 86_400_000);
}

function dayWeight(date: string) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return day === 0 || day === 6 ? 1.35 : 1;
}

const routeScheduleCache = new Map<string, string[]>();

function plannedDatesForQuest(quest: QuestResponse) {
  const safeDuration = Math.max(1, quest.durationDays);
  const safeSteps = Math.max(1, quest.totalSteps);
  const cacheKey = `${quest.id}:${quest.startDate}:${safeDuration}:${safeSteps}`;
  const cached = routeScheduleCache.get(cacheKey);
  if (cached) return cached;

  const quotas = Array.from({ length: safeDuration }, () => 0);

  if (safeSteps <= safeDuration) {
    for (let index = 0; index < safeSteps; index += 1) {
      const offset = safeSteps === 1 ? 0 : Math.round((index * (safeDuration - 1)) / (safeSteps - 1));
      quotas[offset] += 1;
    }
  } else {
    quotas.fill(1);
    let extraSteps = safeSteps - safeDuration;

    while (extraSteps > 0) {
      let bestOffset = 0;
      let bestPressure = Number.POSITIVE_INFINITY;

      for (let offset = 0; offset < safeDuration; offset += 1) {
        const pressure = quotas[offset] / dayWeight(addDays(quest.startDate, offset));
        if (pressure < bestPressure) {
          bestPressure = pressure;
          bestOffset = offset;
        }
      }

      quotas[bestOffset] += 1;
      extraSteps -= 1;
    }
  }

  const result: string[] = [];
  quotas.forEach((count, offset) => {
    for (let step = 0; step < count; step += 1) {
      result.push(addDays(quest.startDate, offset));
    }
  });

  routeScheduleCache.set(cacheKey, result);
  if (routeScheduleCache.size > 50) {
    const firstKey = routeScheduleCache.keys().next().value;
    if (firstKey) routeScheduleCache.delete(firstKey);
  }
  return result;
}

function plannedDateForStep(quest: QuestResponse, stepNumber: number) {
  const dates = plannedDatesForQuest(quest);
  const safeIndex = Math.min(Math.max(stepNumber - 1, 0), dates.length - 1);
  return dates[safeIndex] ?? quest.startDate;
}

function expectedStepsByDate(quest: QuestResponse, date: string) {
  let expected = 0;
  for (let stepNumber = 1; stepNumber <= quest.totalSteps; stepNumber += 1) {
    if (plannedDateForStep(quest, stepNumber) <= date) expected += 1;
  }
  return expected;
}

function baseQuotaForDate(quest: QuestResponse, date: string) {
  let planned = 0;
  for (let stepNumber = 1; stepNumber <= quest.totalSteps; stepNumber += 1) {
    if (plannedDateForStep(quest, stepNumber) === date) planned += 1;
  }
  return Math.max(1, planned);
}

function computePace(quest: QuestResponse | null, steps: QuestStepResponse[], grouped: Record<string, QuestDayStats>, today: string): PaceInfo {
  if (!quest) return { tone: "even", behind: 0, ahead: 0, expectedToday: 0, needDate: null, needCount: 0 };

  const completed = steps.filter((step) => step.status === "COMPLETED").length;
  const expectedToday = expectedStepsByDate(quest, today);
  const expectedBeforeToday = expectedStepsByDate(quest, addDays(today, -1));
  const overduePendingDebt = steps.filter((step) => step.status === "PENDING" && step.scheduledDate < today).length;
  const legacySkippedDebt = steps.filter((step) => step.status === "SKIPPED" && step.scheduledDate <= today).length;
  const lateDebt = Math.max(overduePendingDebt + legacySkippedDebt, Math.max(0, expectedBeforeToday - completed));

  let needDate: string | null = null;
  let needCount = 0;

  const pressureDates = Object.keys(grouped)
    .filter((date) => {
      const stats = grouped[date];
      if (date < today || stats.pending === 0) return false;
      return lateDebt > 0 || stats.total > baseQuotaForDate(quest, date);
    })
    .sort();

  if (pressureDates.length > 0) {
    needDate = pressureDates[0];
    const stats = grouped[needDate];
    needCount = Math.max(stats.total, baseQuotaForDate(quest, needDate) + lateDebt);
  } else if (lateDebt > 0) {
    needDate = addDays(today, 1);
    needCount = Math.max(1, lateDebt);
  }

  const recoveryDebt = needDate ? Math.max(0, needCount - baseQuotaForDate(quest, needDate)) : 0;
  const behind = Math.max(lateDebt, recoveryDebt);
  const ahead = Math.max(0, completed - expectedToday);
  const tone = behind > 0 ? "behind" : ahead > 0 ? "ahead" : "even";

  return { tone, behind, ahead, expectedToday, needDate, needCount };
}

function dayLink(date: string, today: string) {
  return date === today ? "/today" : `/calendar/${date}`;
}

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [days, setDays] = useState<CalendarDayResponse[]>([]);
  const [quests, setQuests] = useState<QuestResponse[]>([]);
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null);
  const [questPickerOpen, setQuestPickerOpen] = useState(false);
  const [displayFiltersOpen, setDisplayFiltersOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>("clean");
  const [showQuestRoute, setShowQuestRoute] = useState(false);
  const [questSteps, setQuestSteps] = useState<QuestStepResponse[]>([]);
  const [planningCatalog, setPlanningCatalog] = useState<PlanningCatalog>({ tasks: [], habits: [], questSteps: [] });
  const [loading, setLoading] = useState(true);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepsError, setStepsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCalendar() {
      setLoading(true);
      setError(null);
      try {
        const [calendarDays, questList, taskList, habitList] = await Promise.all([
          api.calendar.month(cursor.getFullYear(), cursor.getMonth() + 1),
          api.quests.list(),
          api.tasks.list(),
          api.habits.list()
        ]);

        const allQuestSteps = (await Promise.all(
          questList
            .filter((quest) => quest.status === "ACTIVE")
            .map((quest) => api.quests.steps(quest.id).catch(() => [] as QuestStepResponse[]))
        )).flat();

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
    setSelectedQuestId(id);
    setQuestPickerOpen(false);
    if (id) setShowQuestRoute(true);
  }

  return (
    <section className="page calendar-page compact-calendar-page">
      <header className="page-header centered-title-header calendar-title-header">
        <p className="eyebrow">календарь</p>
        <div className="date-inline-switcher calendar-inline-switcher" aria-label="Переключение месяцев">
          <button type="button" className="nav-text-button" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="Предыдущий месяц">← предыдущий</button>
          <h1>{monthLabel(cursor)}</h1>
          <button type="button" className="nav-text-button" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Следующий месяц">следующий →</button>
        </div>
        <button type="button" className="center-jump-button" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>текущий месяц</button>
      </header>

      <section className="section-line calendar-panel stylish-calendar-panel clean-section compact-calendar-shell">
        <div className="calendar-toolbar-stack inline-overlay-host">
          <div className="calendar-left-tools filter-row" aria-label="Настройки календаря">
            <button
              type="button"
              className={displayFiltersOpen ? "active" : ""}
              onClick={() => {
                setDisplayFiltersOpen((value) => {
                  const next = !value;
                  if (next) setShowQuestRoute(false);
                  return next;
                });
              }}
            >
              Фильтры
            </button>
            <button
              type="button"
              className={showQuestRoute ? "active" : ""}
              onClick={() => {
                setShowQuestRoute((value) => {
                  const next = !value;
                  if (next) setDisplayFiltersOpen(false);
                  return next;
                });
              }}
            >
              Маршрут квеста
            </button>
          </div>

          {displayFiltersOpen ? (
            <div className="calendar-inline-filter-panel filter-panel drawer-panel toolbar-popover toolbar-popover--filters" aria-label="Фильтры отображения">
              <div className="filter-row">
                <button type="button" className={displayMode === "clean" ? "active" : ""} onClick={() => setDisplayMode("clean")}>Чисто</button>
                <button type="button" className={displayMode === "workload" ? "active" : ""} onClick={() => setDisplayMode("workload")}>Нагрузка</button>
                <button type="button" className={displayMode === "rewards" ? "active" : ""} onClick={() => setDisplayMode("rewards")}>Итог</button>
                <button type="button" className={displayMode === "full" ? "active" : ""} onClick={() => setDisplayMode("full")}>Всё</button>
              </div>
            </div>
          ) : null}

          {showQuestRoute ? (
            <div className="calendar-route-panel combined-route-panel toolbar-popover toolbar-popover--route">
            <div className="calendar-route-topline">
              <button type="button" className="quest-picker-button compact-quest-picker" onClick={() => setQuestPickerOpen(true)}>
                <span>{selectedQuest ? selectedQuest.title : "Выбрать квест"}</span>
                <small>{selectedQuest ? "сменить" : "маршрут"}</small>
              </button>
              {selectedQuest ? (
                <div className="calendar-stats-row quest-calendar-stats compact-stats-row">
                  <span>{monthCompleted}/{monthSteps.length} в месяце</span>
                  <span>{monthPending} в плане</span>
                  {monthSkipped ? <span>{monthSkipped} пропущено</span> : null}
                </div>
              ) : (
                <span className="muted">выбери квест, чтобы увидеть маршрут</span>
              )}
            </div>

            <div className={`quest-pace-strip compact-pace-strip pace-${selectedQuest ? pace.tone : "idle"}`}>
              <div className="pace-status">
                <span>Темп</span>
                <strong>{selectedQuest ? (pace.behind > 0 ? `отставание: ${pace.behind} ${shortStepWord(pace.behind)}` : pace.ahead > 0 ? `опережение: ${pace.ahead} ${shortStepWord(pace.ahead)}` : "по плану") : "выбери квест"}</strong>
              </div>
              <div>
                <span>Пройдено</span>
                <strong>{selectedQuest ? `${completedTotal}/${selectedQuest.totalSteps}` : "—"}</strong>
              </div>
              <div>
                <span>Следующий шаг</span>
                <strong>{selectedQuest ? (nextPending ? `#${nextPending.stepNumber} · ${nextPending.scheduledDate}` : "финиш") : "—"}</strong>
              </div>
              <div>
                <span>До цели</span>
                <strong>{selectedQuest ? (daysLeft === null ? "—" : daysLeft >= 0 ? `${daysLeft} дн.` : `+${Math.abs(daysLeft)} дн.`) : "—"}</strong>
              </div>
            </div>
          </div>
          ) : null}
        </div>

        {questPickerOpen ? (
          <div className="quest-picker-backdrop" role="presentation" onClick={() => setQuestPickerOpen(false)}>
            <div className="quest-picker-dialog" role="dialog" aria-modal="true" aria-label="Выбор квеста" onClick={(event) => event.stopPropagation()}>
              <div className="section-title-row small-title-row">
                <div>
                  <p className="eyebrow">выбор квеста</p>
                  <h2>Какой квест показать?</h2>
                </div>
                <button type="button" className="dialog-close" onClick={() => setQuestPickerOpen(false)} aria-label="Закрыть">×</button>
              </div>
              <div className="quest-picker-list">
                {quests.map((quest) => (
                  <button type="button" key={quest.id} className={selectedQuestId === quest.id ? "active" : ""} onClick={() => chooseQuest(quest.id)}>
                    <strong>{quest.title}</strong>
                    <span>{quest.status.toLowerCase()} · {quest.totalSteps} шагов</span>
                  </button>
                ))}
                {quests.length === 0 ? <p className="muted">Квестов пока нет.</p> : null}
              </div>
              {selectedQuest ? <button type="button" className="btn btn-ghost clear-quest-button" onClick={() => chooseQuest(null)}>Сбросить выбор</button> : null}
            </div>
          </div>
        ) : null}

        {loading ? <Loader /> : <ErrorLine error={error} />}
        {stepsLoading ? <Loader label="Загружаем шаги квеста" /> : null}
        <ErrorLine error={stepsError} />
        {!loading && showQuestRoute && quests.length === 0 ? <EmptyState title="Квестов пока нет" text="Создай квест, и календарь покажет его маршрут." /> : null}
        {!loading && showQuestRoute && selectedQuest && questSteps.length === 0 && !stepsLoading ? <EmptyState title="У выбранного квеста нет шагов" /> : null}

        <div className="calendar-grid compact-calendar pretty-calendar refined-calendar quest-calendar-grid smaller-calendar-grid">
          {weekdayHeader.map((name, index) => <div className="weekday" key={`${name}-${index}`}>{name}</div>)}
          {cells.map((day) => {
            const questStats = selectedQuest ? (stepStatsByDate[day.date] ?? { total: 0, completed: 0, skipped: 0, pending: 0 }) : { total: 0, completed: 0, skipped: 0, pending: 0 };
            const hasQuestSteps = Boolean(showQuestRoute && selectedQuest && questStats.total > 0);
            const isNeedDay = Boolean(showQuestRoute && selectedQuest && pace.needDate === day.date && pace.needCount > 0);
            const isPastDue = Boolean(showQuestRoute && selectedQuest && day.date < today && questStats.pending > 0);
            const showPastCompleted = day.date < today && day.status === "CLOSED" && day.totalCount > 0;
            return (
              <Link
                className={`calendar-cell status-${String(day.status).toLowerCase()} ${day.date === today ? "today" : ""} ${hasQuestSteps ? "has-quest-steps" : ""} ${isPastDue ? "quest-behind-day" : ""} ${isNeedDay ? `quest-need-day need-${pace.tone}` : ""}`}
                key={day.date}
                to={dayLink(day.date, today)}
              >
                <span className="calendar-top">
                  <strong>{Number(day.date.slice(8, 10))}</strong>
                  <small>{pastClosedStatus(day, today)}</small>
                </span>
                {showPastCompleted ? <span className="calendar-line completed-day-line">выполнено {day.completedCount}/{day.totalCount}</span> : null}
                {hasQuestSteps ? <span className="quest-step-line">{questDayLabel(questStats.total, questStats.completed, day.date, today)}</span> : null}
                {isNeedDay ? <span className={`need-badge need-${pace.tone}`}>надо {pace.needCount}</span> : null}
                {showWorkload && day.totalCount > 0 ? <CalendarWorkload day={day} /> : null}
                {showRewards && (day.xpEarned || day.hpDelta) ? <span className="reward-line"><span className="xp-token">XP {signed(day.xpEarned)}</span><span className="hp-token">HP {signed(day.hpDelta)}</span></span> : null}
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}
