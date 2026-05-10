import { FormEvent, useEffect, useState } from "react";
import { api } from "../../api/http";
import type { QuestResponse, QuestStepResponse, UpdateQuestStepRequest } from "../../api/types";
import { Button } from "../Button";
import { DateWheelInput, Field, TextArea, TextInput, TimeWheelInput } from "../FormFields";
import { addDays, computePace, groupQuestSteps, shortStepWord } from "../../utils/calendarSchedule";
import { formatDate, formatTime, pct, todayISO } from "../../utils/format";

function statusTone(status: QuestStepResponse["status"]) {
  if (status === "COMPLETED") return "готово";
  if (status === "SKIPPED") return "сорвано";
  return "в пути";
}

interface QuestRouteViewProps {
  steps: QuestStepResponse[];
  quest: QuestResponse | null;
  onSaved: () => Promise<void>;
}

export function QuestRouteView({ steps, quest, onSaved }: QuestRouteViewProps) {
  const [selectedStepId, setSelectedStepId] = useState<number | null>(steps[0]?.id ?? null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [form, setForm] = useState<UpdateQuestStepRequest>({
    title: steps[0]?.title ?? "",
    description: steps[0]?.description ?? "",
    scheduledDate: steps[0]?.scheduledDate ?? todayISO(),
    plannedTime: steps[0]?.plannedTime ?? "",
    deadlineTime: steps[0]?.deadlineTime ?? ""
  });

  useEffect(() => {
    if (!steps.some((step) => step.id === selectedStepId)) setSelectedStepId(steps[0]?.id ?? null);
  }, [steps, selectedStepId]);

  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? steps[0] ?? null;

  useEffect(() => {
    if (!selectedStep) return;
    setForm({
      title: selectedStep.title,
      description: selectedStep.description ?? "",
      scheduledDate: selectedStep.scheduledDate,
      plannedTime: selectedStep.plannedTime ?? "",
      deadlineTime: selectedStep.deadlineTime ?? ""
    });
    setEditingStepId(null);
  }, [selectedStep?.id]);

  const today = todayISO();
  const questTotal = quest?.totalSteps ?? steps.length;
  const completed = steps.filter((step) => step.status === "COMPLETED").length;
  const pace = computePace(quest, steps, groupQuestSteps(steps), today);
  const progress = questTotal ? pct(completed, questTotal) : 0;
  const paceLabel = pace.behind > 0
    ? `отставание: ${pace.behind} ${shortStepWord(pace.behind)}`
    : pace.ahead > 0
      ? `опережение: ${pace.ahead} ${shortStepWord(pace.ahead)}`
      : "по плану";

  async function shiftStep(step: QuestStepResponse, targetDate: string) {
    setBusyId(step.id);
    try {
      await api.quests.updateStep(step.id, {
        title: step.title,
        description: step.description ?? null,
        scheduledDate: targetDate,
        plannedTime: step.plannedTime ?? null,
        deadlineTime: step.deadlineTime ?? null
      });
      await onSaved();
    } finally {
      setBusyId(null);
    }
  }

  async function saveRouteEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStep) return;
    setBusyId(selectedStep.id);
    try {
      await api.quests.updateStep(selectedStep.id, {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        scheduledDate: form.scheduledDate,
        plannedTime: form.plannedTime || null,
        deadlineTime: form.deadlineTime || null
      });
      setEditingStepId(null);
      await onSaved();
    } finally {
      setBusyId(null);
    }
  }

  if (steps.length === 0) return null;

  return (
    <div className="quest-route-board polished-route-board redesigned-route-board">
      <div className="quest-route-head">
        <div>
          <p className="eyebrow">маршрут</p>
          <strong>{completed}/{questTotal || steps.length} пройдено</strong>
          {quest?.description ? <small className="route-quest-description">{quest.description}</small> : null}
        </div>
        <div className="quest-route-meter" aria-label={`Прогресс ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
        <span className={pace.tone === "behind" ? "route-alert" : "route-ok"}>{paceLabel}</span>
      </div>

      <div className="quest-route-track" role="list" aria-label="Маршрут шагов квеста">
        {steps.map((step) => (
          <button
            type="button"
            role="listitem"
            key={step.id}
            className={`quest-route-node status-${step.status.toLowerCase()} ${selectedStep?.id === step.id ? "selected" : ""}`}
            onClick={() => setSelectedStepId(step.id)}
            title={`${step.stepNumber}. ${step.title}`}
          >
            <span>{step.stepNumber}</span>
          </button>
        ))}
      </div>

      {selectedStep ? (
        <>
          <div className={`quest-route-focus status-${selectedStep.status.toLowerCase()}`}>
            <div>
              <span className="route-step-kicker">Шаг {selectedStep.stepNumber} · {statusTone(selectedStep.status)}</span>
              <strong>{selectedStep.title}</strong>
              <small>{formatDate(selectedStep.scheduledDate)}{selectedStep.plannedTime ? ` · ${formatTime(selectedStep.plannedTime)}` : ""}</small>
            </div>
            <div className="route-step-actions">
              {selectedStep.status === "PENDING" ? (
                <Button
                  variant="thin"
                  disabled={busyId === selectedStep.id}
                  onClick={() => shiftStep(selectedStep, selectedStep.scheduledDate === today ? addDays(today, 1) : today)}
                >
                  {selectedStep.scheduledDate === today ? "Отложить на завтра" : "На сегодня"}
                </Button>
              ) : null}
              <Button type="button" variant="thin" onClick={() => setEditingStepId((current) => current === selectedStep.id ? null : selectedStep.id)}>
                {editingStepId === selectedStep.id ? "Скрыть" : "Изменить шаг"}
              </Button>
            </div>
          </div>

          {editingStepId === selectedStep.id ? (
            <form className="route-step-edit compact-create-form" onSubmit={saveRouteEdit}>
              <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={160} />
              <div className="route-step-edit-grid">
                <Field label="Дата"><DateWheelInput value={form.scheduledDate} onChange={(value) => setForm({ ...form, scheduledDate: value || selectedStep.scheduledDate })} allowClear={false} /></Field>
                <Field label="Время"><TimeWheelInput value={form.plannedTime ?? null} onChange={(value) => setForm({ ...form, plannedTime: value })} /></Field>
                <Field label="Дедлайн"><TimeWheelInput value={form.deadlineTime ?? null} onChange={(value) => setForm({ ...form, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" /></Field>
              </div>
              <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} placeholder="Описание шага" />
              <div className="form-actions route-edit-actions">
                <Button disabled={busyId === selectedStep.id || !form.title.trim()}>Сохранить</Button>
                <Button type="button" variant="ghost" onClick={() => setEditingStepId(null)}>Отмена</Button>
              </div>
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
