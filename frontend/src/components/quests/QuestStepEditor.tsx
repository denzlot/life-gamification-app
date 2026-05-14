import { FormEvent, useEffect, useState } from "react";
import { api } from "../../api/http";
import type { QuestStepResponse, UpdateQuestStepRequest } from "../../api/types";
import { Button } from "../Button";
import { RevealSection } from "../RevealSection";
import { OptionChip } from "../OptionChip";
import { DateWheelInput, TextArea, TextInput, TimeWheelInput } from "../FormFields";
import { ErrorLine } from "../Loader";
import { addDays } from "../../utils/calendarSchedule";
import { formatDate, formatTime, pct, stepStatusLabel, todayISO } from "../../utils/format";

interface QuestStepEditorProps {
  step: QuestStepResponse;
  questTotal: number;
  onSaved: () => Promise<void>;
}

export function QuestStepEditor({ step, questTotal, onSaved }: QuestStepEditorProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateQuestStepRequest>({
    title: step.title,
    description: step.description ?? "",
    scheduledDate: step.scheduledDate,
    plannedTime: step.plannedTime ?? "",
    deadlineTime: step.deadlineTime ?? ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState({ date: false, time: false, deadline: false, description: false });
  const isCompleted = step.status === "COMPLETED";
  const today = todayISO();

  useEffect(() => {
    setForm({
      title: step.title,
      description: step.description ?? "",
      scheduledDate: step.scheduledDate,
      plannedTime: step.plannedTime ?? "",
      deadlineTime: step.deadlineTime ?? ""
    });
    setOptions({
      date: false,
      time: !isCompleted && Boolean(step.plannedTime),
      deadline: !isCompleted && Boolean(step.deadlineTime),
      description: Boolean(step.description)
    });
    setError(null);
  }, [step, isCompleted]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isCompleted && form.scheduledDate < today) {
      setError("Нельзя перенести шаг в прошлое");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.quests.updateStep(step.id, {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        scheduledDate: isCompleted ? step.scheduledDate : form.scheduledDate,
        plannedTime: isCompleted ? step.plannedTime ?? null : form.plannedTime || null,
        deadlineTime: isCompleted ? step.deadlineTime ?? null : form.deadlineTime || null
      });
      setEditing(false);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить шаг");
    } finally {
      setBusy(false);
    }
  }

  async function shiftStep(targetDate: string) {
    if (targetDate < today) {
      setError("Нельзя перенести шаг в прошлое");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.quests.updateStep(step.id, {
        title: step.title,
        description: step.description ?? null,
        scheduledDate: targetDate,
        plannedTime: step.plannedTime ?? null,
        deadlineTime: step.deadlineTime ?? null
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось перенести шаг");
    } finally {
      setBusy(false);
    }
  }

  const progress = questTotal ? pct(step.stepNumber, questTotal) : 0;

  if (editing) {
    return (
      <form className="line-item step-edit compact-create-form" onSubmit={save}>
        <div className="step-edit-fields">
          <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          <div className="step-edit-control-row">
            <div className="step-edit-options">
              {!isCompleted ? (
                <OptionChip active={options.date} onClick={() => setOptions((state) => ({ ...state, date: !state.date }))}>
                  {`Дата: ${formatDate(form.scheduledDate)}`}
                </OptionChip>
              ) : null}
              {!isCompleted ? (
                <OptionChip active={options.time || Boolean(form.plannedTime)} onClick={() => setOptions((state) => ({ ...state, time: !state.time }))}>
                  {form.plannedTime ? `Время: ${formatTime(form.plannedTime)}` : "Время"}
                </OptionChip>
              ) : null}
              {!isCompleted ? (
                <OptionChip active={options.deadline || Boolean(form.deadlineTime)} onClick={() => setOptions((state) => ({ ...state, deadline: !state.deadline }))}>
                  {form.deadlineTime ? `Дедлайн: ${formatTime(form.deadlineTime)}` : "Дедлайн"}
                </OptionChip>
              ) : null}
              <OptionChip active={options.description || Boolean(form.description)} onClick={() => setOptions((state) => ({ ...state, description: !state.description }))}>Описание</OptionChip>
            </div>
            <div className="item-tail wide-tail step-edit-actions">
              <Button variant="thin" disabled={busy}>Сохранить</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Отмена</Button>
            </div>
          </div>
          <RevealSection open={!isCompleted && options.date} className="option-reveal--wide">
            <DateWheelInput value={form.scheduledDate} onChange={(value) => setForm({ ...form, scheduledDate: value || step.scheduledDate })} allowClear={false} />
          </RevealSection>
          <RevealSection open={!isCompleted && options.time} className="option-reveal--wide">
            <TimeWheelInput value={form.plannedTime ?? null} onChange={(value) => setForm({ ...form, plannedTime: value })} />
          </RevealSection>
          <RevealSection open={!isCompleted && options.deadline} className="option-reveal--wide">
            <TimeWheelInput value={form.deadlineTime ?? null} onChange={(value) => setForm({ ...form, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" />
          </RevealSection>
          <RevealSection open={options.description} className="option-reveal--wide">
            <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </RevealSection>
          <ErrorLine error={error} />
        </div>
      </form>
    );
  }

  return (
    <article className={`line-item quest-step status-${step.status.toLowerCase()}`}>
      <div className="quest-step-main">
        <div className="item-title-line">
          <strong>{step.stepNumber}. {step.title}</strong>
          <span className="item-type-badge">шаг</span>
        </div>
        <p className="muted">
          {stepStatusLabel(step.status)} · {formatDate(step.scheduledDate)}{step.plannedTime ? ` · ${formatTime(step.plannedTime)}` : ""}{step.deadlineTime ? ` · дедлайн ${formatTime(step.deadlineTime)}` : ""} · маршрут {progress}%
        </p>
      </div>
      <div className="item-tail wide-tail">
        <span>{stepStatusLabel(step.status)}</span>
        {step.status === "PENDING" ? (
          <Button variant="thin" disabled={busy} onClick={() => shiftStep(step.scheduledDate === today ? addDays(today, 1) : today)}>
            {step.scheduledDate === today ? "Отложить на завтра" : "На сегодня"}
          </Button>
        ) : null}
        <Button variant="thin" onClick={() => setEditing(true)}>Изменить шаг</Button>
      </div>
      <ErrorLine error={error} />
    </article>
  );
}
