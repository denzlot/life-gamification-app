import type { QuestResponse, QuestStepResponse } from "../../api/types";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { Loader } from "../Loader";
import { QuestRouteView } from "./QuestRouteView";
import { QuestStepEditor } from "./QuestStepEditor";

interface QuestStepsPanelProps {
  selected: QuestResponse | null;
  steps: QuestStepResponse[];
  stepsLoading: boolean;
  stepsView: "list" | "route";
  onToggleStepsView: () => void;
  onSaved: () => Promise<void>;
}

export function QuestStepsPanel({ selected, steps, stepsLoading, stepsView, onToggleStepsView, onSaved }: QuestStepsPanelProps) {
  return (
    <section className="section-line clean-section">
      <div className="section-title-row quest-steps-title-row">
        <div>
          <p className="eyebrow">шаги</p>
          <h2>{selected ? selected.title : "Квест не выбран"}</h2>
          {selected?.description ? <p className="muted quest-description-line">{selected.description}</p> : null}
        </div>
        <Button type="button" variant="ghost" onClick={onToggleStepsView}>
          {stepsView === "list" ? "Маршрут" : "Список шагов"}
        </Button>
      </div>
      {stepsLoading ? <Loader /> : null}
      {selected && steps.length === 0 && !stepsLoading ? <EmptyState title="Шаги не загружены" /> : null}
      <p className="muted quest-steps-hint">Можно переносить шаги на другой день вручную. Для сегодняшнего шага доступна кнопка «Отложить на завтра», а будущие шаги можно быстро вернуть на сегодня.</p>
      {stepsView === "route" ? (
        <QuestRouteView steps={steps} quest={selected} onSaved={onSaved} />
      ) : (
        <div className="line-list step-list typed-list quest-steps-list">
          {steps.map((step) => (
            <QuestStepEditor key={step.id} step={step} questTotal={selected?.totalSteps ?? 0} onSaved={onSaved} />
          ))}
        </div>
      )}
    </section>
  );
}
