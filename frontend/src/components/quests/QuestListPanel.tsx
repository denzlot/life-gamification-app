import type { QuestResponse } from "../../api/types";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { ErrorLine, Loader } from "../Loader";
import { formatDate, formatTime } from "../../utils/format";

interface QuestListPanelProps {
  quests: QuestResponse[];
  loading: boolean;
  error: string | null;
  showArchived: boolean;
  selectedId: number | null;
  busy: boolean;
  onToggleArchived: () => void;
  onSelect: (id: number) => void;
  onEdit: (quest: QuestResponse) => void;
  onArchive: (quest: QuestResponse) => void;
  onRestore: (quest: QuestResponse) => void;
  onRemove: (quest: QuestResponse) => void;
}

export function QuestListPanel({
  quests,
  loading,
  error,
  showArchived,
  selectedId,
  busy,
  onToggleArchived,
  onSelect,
  onEdit,
  onArchive,
  onRestore,
  onRemove
}: QuestListPanelProps) {
  return (
    <section className="section-line clean-section quest-panel quest-list-panel">
      <div className="quest-panel-head">
        <div className="quest-panel-title">
          <p className="eyebrow">список квестов</p>
        </div>
        <Button type="button" variant="thin" className="quest-action-btn" onClick={onToggleArchived}>{showArchived ? "Показать активные" : "Архив"}</Button>
      </div>

      <div className="quest-panel-body">
        {loading ? <Loader /> : <ErrorLine error={error} />}
        {!loading && quests.length === 0 ? (
          <div className="quest-empty-state">
            <EmptyState
              title={showArchived ? "Архив пуст" : "Квестов пока нет"}
              text={showArchived ? "Архивные квесты будут здесь. Их можно вернуть в активные." : "Создай длинную цель и получи шаги по датам."}
            />
          </div>
        ) : null}
        <div className="line-list typed-list quest-list">
          {quests.map((quest) => {
            const meta = [
              `${formatDate(quest.startDate)} — ${formatDate(quest.targetDate)}`,
              quest.plannedTime ? formatTime(quest.plannedTime) : null,
              quest.deadlineTime ? `дедлайн ${formatTime(quest.deadlineTime)}` : null
            ].filter(Boolean).join(" · ");

            return (
              <article className={`line-item clickable ${selectedId === quest.id ? "selected" : ""}`} key={quest.id} onClick={() => onSelect(quest.id)}>
                <div className="quest-row-main">
                  <div className="item-title-line">
                    <strong>{quest.title}</strong>
                  </div>
                  <p className="muted">{meta}</p>
                </div>
                <div className="item-tail wide-tail">
                  <span>{quest.totalSteps} шагов</span>
                  <Button variant="thin" className="quest-action-btn" onClick={(event) => { event.stopPropagation(); onEdit(quest); }}>Изменить</Button>
                  {quest.status === "COMPLETED" ? null : quest.status === "ARCHIVED" ? (
                    <Button variant="thin" className="quest-action-btn" disabled={busy} onClick={(event) => { event.stopPropagation(); onRestore(quest); }}>Вернуть</Button>
                  ) : (
                    <Button variant="thin" className="quest-action-btn" disabled={busy} onClick={(event) => { event.stopPropagation(); onArchive(quest); }}>В архив</Button>
                  )}
                  <Button variant="thin" className="quest-action-btn quest-action-btn--danger" disabled={busy} onClick={(event) => { event.stopPropagation(); onRemove(quest); }}>Удалить</Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
