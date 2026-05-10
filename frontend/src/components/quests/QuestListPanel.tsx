import type { QuestResponse } from "../../api/types";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { ErrorLine, Loader } from "../Loader";
import { formatDate, formatTime, questStatusLabel } from "../../utils/format";

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
    <section className="section-line clean-section">
      <div className="section-title-row quest-list-title-row">
        <div>
          <p className="eyebrow">список квестов</p>
        </div>
        <Button type="button" variant="ghost" onClick={onToggleArchived}>{showArchived ? "Показать активные" : "Архив"}</Button>
      </div>
      {loading ? <Loader /> : <ErrorLine error={error} />}
      {!loading && quests.length === 0 ? (
        <EmptyState
          title={showArchived ? "Архив пуст" : "Квестов пока нет"}
          text={showArchived ? "Архивные квесты будут здесь. Их можно вернуть в активные." : "Создай длинную цель и получи шаги по датам."}
        />
      ) : null}
      <div className="line-list typed-list">
        {quests.map((quest) => (
          <article className={`line-item clickable ${selectedId === quest.id ? "selected" : ""}`} key={quest.id} onClick={() => onSelect(quest.id)}>
            <div className="quest-row-main">
              <div className="item-title-line">
                <strong>{quest.title}</strong>
                <span className="item-type-badge">квест</span>
              </div>
              <p className="muted">
                {questStatusLabel(quest.status)} · {formatDate(quest.startDate)} — {formatDate(quest.targetDate)}{quest.plannedTime ? ` · ${formatTime(quest.plannedTime)}` : ""}{quest.deadlineTime ? ` · дедлайн ${formatTime(quest.deadlineTime)}` : ""}
              </p>
            </div>
            <div className="item-tail wide-tail">
              <span>{quest.totalSteps} шагов</span>
              <Button variant="thin" onClick={(event) => { event.stopPropagation(); onEdit(quest); }}>Изменить</Button>
              {quest.status === "COMPLETED" ? null : quest.status === "ARCHIVED" ? (
                <Button variant="thin" disabled={busy} onClick={(event) => { event.stopPropagation(); onRestore(quest); }}>Вернуть</Button>
              ) : (
                <Button variant="thin" disabled={busy} onClick={(event) => { event.stopPropagation(); onArchive(quest); }}>В архив</Button>
              )}
              <Button variant="danger" disabled={busy} onClick={(event) => { event.stopPropagation(); onRemove(quest); }}>Удалить</Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
