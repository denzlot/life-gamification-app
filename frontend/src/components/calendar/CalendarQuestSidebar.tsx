import type { QuestResponse, QuestStepResponse } from "../../api/types";
import { ErrorLine } from "../Loader";
import { shortStepWord, type PaceInfo } from "../../utils/calendarSchedule";

interface CalendarQuestSidebarProps {
  loading: boolean;
  quests: QuestResponse[];
  selectedQuest: QuestResponse | null;
  selectedQuestId: number | null;
  stepsError: string | null;
  pace: PaceInfo;
  monthSteps: QuestStepResponse[];
  monthCompleted: number;
  monthPending: number;
  nextPending: QuestStepResponse | null;
  daysLeft: number | null;
  completedTotal: number;
  onChooseQuest: (id: number | null) => void;
}

export function CalendarQuestSidebar({
  loading,
  quests,
  selectedQuest,
  selectedQuestId,
  stepsError,
  pace,
  monthSteps,
  monthCompleted,
  monthPending,
  nextPending,
  daysLeft,
  completedTotal,
  onChooseQuest
}: CalendarQuestSidebarProps) {
  const progressPercent = selectedQuest ? Math.round((completedTotal / selectedQuest.totalSteps) * 100) : 0;

  return (
    <aside className="calendar-quest-sidebar">
      <div className="calendar-sidebar-head">
        <p className="eyebrow">маршрут</p>
        <strong>{selectedQuest ? selectedQuest.title : "Выбери квест"}</strong>
      </div>

      {quests.length === 0 && !loading ? (
        <p className="muted calendar-sidebar-empty">Квестов пока нет. Создай квест — и здесь появится маршрут.</p>
      ) : null}

      <div className="calendar-route-quest-list sidebar-quest-list">
        {quests.map((quest) => (
          <button type="button" key={quest.id} className={`sidebar-quest-btn ${selectedQuestId === quest.id ? "active" : ""}`} onClick={() => onChooseQuest(quest.id)}>
            <strong>{quest.title}</strong>
            <span>{quest.totalSteps} {shortStepWord(quest.totalSteps)} · до {quest.targetDate ?? "цели"}</span>
          </button>
        ))}
      </div>

      {selectedQuest ? (
        <div className={`quest-sidebar-pace pace-${pace.tone}`}>
          <ErrorLine error={stepsError} />
          <div className="sidebar-pace-row">
            <span>Темп</span>
            <strong className="pace-value">{pace.behind > 0 ? `−${pace.behind} ${shortStepWord(pace.behind)}` : pace.ahead > 0 ? `+${pace.ahead} ${shortStepWord(pace.ahead)}` : "по плану"}</strong>
          </div>
          <div className="sidebar-pace-row">
            <span>Месяц</span>
            <strong>{monthCompleted}/{monthSteps.length}</strong>
          </div>
          <div className="sidebar-pace-row">
            <span>В плане</span>
            <strong>{monthPending}</strong>
          </div>
          <div className="sidebar-pace-row">
            <span>Следующий шаг</span>
            <strong>{nextPending ? `#${nextPending.stepNumber} · ${nextPending.scheduledDate}` : "финиш"}</strong>
          </div>
          <div className="sidebar-pace-row">
            <span>До цели</span>
            <strong>{daysLeft === null ? "—" : daysLeft >= 0 ? `${daysLeft} дн.` : `+${Math.abs(daysLeft)} дн.`}</strong>
          </div>
          <div className="sidebar-pace-row">
            <span>Всего выполнено</span>
            <strong>{completedTotal} / {selectedQuest.totalSteps}</strong>
          </div>
          <div className="sidebar-progress-bar">
            <div className="meter"><span style={{ width: `${progressPercent}%` }} /></div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
