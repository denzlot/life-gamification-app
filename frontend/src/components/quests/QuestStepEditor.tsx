import { FormEvent, useEffect, useState } from "react";
import { api } from "../../api/http";
import type { QuestStepResponse, UpdateQuestStepRequest } from "../../api/types";
import { Button } from "../Button";
import { RevealSection } from "../RevealSection";
import { OptionChip } from "../OptionChip";
import { DateWheelInput, TextArea, TextInput, TimeWheelInput } from "../FormFields";
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
  const [options, setOptions] = useState({ date: false, time: false, deadline: false, description: false });

  useEffect(() => {
    setForm({ title: step.title, description: step.description ?? "", scheduledDate: step.scheduledDate, plannedTime: step.plannedTime ?? "", deadlineTime: step.deadlineTime ?? "" });
    setOptions({ date: false, time: Boolean(step.plannedTime), deadline: Boolean(step.deadlineTime), description: Boolean(step.description) });
  }, [step]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.quests.updateStep(step.id, {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        scheduledDate: form.scheduledDate,
        plannedTime: form.plannedTime || null,
        deadlineTime: form.deadlineTime || null
      });
      setEditing(false);
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function shiftStep(targetDate: string) {
    setBusy(true);
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
              <OptionChip active={options.date} onClick={() => setOptions((state) => ({ ...state, date: !state.date }))}>{`Дата: ${formatDate(form.scheduledDate)}`}</OptionChip>
              <OptionChip active={options.time || Boolean(form.plannedTime)} onClick={() => setOptions((state) => ({ ...state, time: !state.time }))}>{form.plannedTime ? `Время: ${formatTime(form.plannedTime)}` : "Время"}</OptionChip>
              <OptionChip active={options.deadline || Boolean(form.deadlineTime)} onClick={() => setOptions((state) => ({ ...state, deadline: !state.deadline }))}>{form.deadlineTime ? `Дедлайн: ${formatTime(form.deadlineTime)}` : "Дедлайн"}</OptionChip>
              <OptionChip active={options.description || Boolean(form.description)} onClick={() => setOptions((state) => ({ ...state, description: !state.description }))}>Описание</OptionChip>
            </div>
            <div className="item-tail wide-tail step-edit-actions">
              <Button variant="thin" disabled={busy}>Сохранить</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Отмена</Button>
            </div>
          </div>
          <RevealSection open={options.date} className="option-reveal--wide">
            <DateWheelInput value={form.scheduledDate} onChange={(value) => setForm({ ...form, scheduledDate: value || step.scheduledDate })} allowClear={false} />
          </RevealSection>
          <RevealSection open={options.time} className="option-reveal--wide">
            <TimeWheelInput value={form.plannedTime ?? null} onChange={(value) => setForm({ ...form, plannedTime: value })} />
          </RevealSection>
          <RevealSection open={options.deadline} className="option-reveal--wide">
            <TimeWheelInput value={form.deadlineTime ?? null} onChange={(value) => setForm({ ...form, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" />
          </RevealSection>
          <RevealSection open={options.description} className="option-reveal--wide">
            <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </RevealSection>
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
          <Button variant="thin" disabled={busy} onClick={() => shiftStep(step.scheduledDate === todayISO() ? addDays(todayISO(), 1) : todayISO())}>
            {step.scheduledDate === todayISO() ? "Отложить на завтра" : "На сегодня"}
          </Button>
        ) : null}
        <Button variant="thin" onClick={() => setEditing(true)}>Изменить шаг</Button>
      </div>
    </article>
  );
}
