import type { KeyboardEvent } from "react";
import type { CalendarDayResponse, DailyPlanItemResponse, DailyPlanItemStatus, DailyPlanResponse, SourceType } from "../../api/types";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { DayNoteEditor } from "./DayNoteEditor";
import { DayPlanGroups } from "./DayPlanGroups";
import { signed } from "../../utils/format";

interface DayPlanGroup {
  source: SourceType;
  title: string;
  items: DailyPlanItemResponse[];
}

interface DayPlanSectionProps {
  summary: CalendarDayResponse | null;
  plan: DailyPlanResponse | null;
  items: DailyPlanItemResponse[];
  groups: DayPlanGroup[];
  counts: Record<DailyPlanItemStatus, number>;
  completedPct: number;
  loading: boolean;
  isPast: boolean;
  isFuture: boolean;
  isClosed: boolean;
  sortByTime: boolean;
  twoColumnLayout: boolean;
  noteOpen: boolean;
  noteDraft: string;
  noteSaving: boolean;
  busy: boolean;
  busyItemId: number | null;
  editingId: number | null;
  editTitle: string;
  openDescriptionId: number | null;
  setSortByTime: (updater: (value: boolean) => boolean) => void;
  toggleTwoColumnLayout: () => void;
  setNoteOpen: (updater: (value: boolean) => boolean) => void;
  setNoteDraft: (value: string) => void;
  setEditTitle: (value: string) => void;
  onCloseDay: () => void;
  onSaveNote: () => void;
  onCycle: (item: DailyPlanItemResponse) => void;
  onToggleDescription: (id: number) => void;
  onBeginEdit: (item: DailyPlanItemResponse) => void;
  onSaveTitle: (item: DailyPlanItemResponse) => void;
  onTitleKey: (event: KeyboardEvent<HTMLInputElement>, item: DailyPlanItemResponse) => void;
}

export function DayPlanSection({
  summary,
  plan,
  items,
  groups,
  counts,
  completedPct,
  loading,
  isPast,
  isFuture,
  isClosed,
  sortByTime,
  twoColumnLayout,
  noteOpen,
  noteDraft,
  noteSaving,
  busy,
  busyItemId,
  editingId,
  editTitle,
  openDescriptionId,
  setSortByTime,
  toggleTwoColumnLayout,
  setNoteOpen,
  setNoteDraft,
  setEditTitle,
  onCloseDay,
  onSaveNote,
  onCycle,
  onToggleDescription,
  onBeginEdit,
  onSaveTitle,
  onTitleKey
}: DayPlanSectionProps) {
  const canChangeStatus = Boolean(plan) && !isClosed && !isPast && !isFuture;

  return (
    <>
      <section className="section-line clean-section day-plan-section">
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
          <DayPlanGroups
            groups={groups}
            twoColumnLayout={twoColumnLayout}
            canChangeStatus={canChangeStatus}
            busyItemId={busyItemId}
            editingId={editingId}
            editTitle={editTitle}
            openDescriptionId={openDescriptionId}
            setEditTitle={setEditTitle}
            onCycle={onCycle}
            onToggleDescription={onToggleDescription}
            onBeginEdit={onBeginEdit}
            onSaveTitle={onSaveTitle}
            onTitleKey={onTitleKey}
          />
        ) : null}

        {!loading && !plan && items.length === 0 ? <EmptyState title="На этот день пока ничего не назначено" text="Добавь задачу или распредели шаг квеста на эту дату." /> : null}
        {!loading && plan && items.length === 0 ? <EmptyState title="Пока пусто" text="Создай задачу или настрой привычки и квесты." /> : null}

        <div className="day-note-in-plan">
          {plan?.note && !noteOpen ? <p className="day-note-preview">{plan.note}</p> : null}
          {noteOpen ? <DayNoteEditor noteDraft={noteDraft} setNoteDraft={setNoteDraft} noteSaving={noteSaving} onSave={onSaveNote} /> : null}
          {plan && isClosed ? <p className="muted closed-day-note">День закрыт. Изменения уже учтены в streak, HP и XP.</p> : null}
        </div>
      </section>

      {plan ? (
        <div className="day-plan-external-actions">
          <Button type="button" variant="ghost" onClick={() => setNoteOpen((value) => !value)}>
            {noteOpen ? "Скрыть заметку" : plan.note ? "Изменить заметку" : "Заметка"}
          </Button>
          {!isClosed && !isPast && !isFuture ? <Button variant="danger" onClick={onCloseDay} disabled={busy}>Закрыть день</Button> : null}
        </div>
      ) : null}
    </>
  );
}
