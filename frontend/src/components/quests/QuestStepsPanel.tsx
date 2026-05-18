import type { QuestResponse, QuestStepResponse } from "../../api/types";
import { EmptyState } from "../EmptyState";
import { Loader } from "../Loader";
import { QuestRouteView } from "./QuestRouteView";

interface QuestStepsPanelProps {
  selected: QuestResponse | null;
  steps: QuestStepResponse[];
  stepsLoading: boolean;
  onSaved: () => Promise<void>;
}

export function QuestStepsPanel({ selected, steps, stepsLoading, onSaved }: QuestStepsPanelProps) {
  return (
    <section className="section-line clean-section quest-panel quest-steps-panel">
      <div className="quest-panel-head">
        <div className="quest-panel-title">
          <p className="eyebrow">
            шаги{selected ? <span className="quest-panel-inline-title"> · {selected.title}</span> : null}
          </p>
          {!selected ? <h2>Шаги квеста</h2> : null}
          {selected?.description ? <p className="muted quest-description-line">{selected.description}</p> : null}
        </div>
      </div>

      <div className="quest-panel-body">
        {!selected ? (
          <div className="quest-empty-state">
            <EmptyState title="Квест не выбран" text="Выбери квест слева, и его шаги появятся здесь." />
          </div>
        ) : (
          <>
            {stepsLoading ? <Loader /> : null}
            {steps.length === 0 && !stepsLoading ? (
              <div className="quest-empty-state">
                <EmptyState title="Шаги не загружены" />
              </div>
            ) : null}
            {!stepsLoading && steps.length > 0 ? (
              <>
                <p className="muted quest-steps-hint">Можно переносить шаги на другой день вручную. Для сегодняшнего шага доступна кнопка «Отложить на завтра», а будущие шаги можно быстро вернуть на сегодня.</p>
                <QuestRouteView steps={steps} quest={selected} onSaved={onSaved} />
              </>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
