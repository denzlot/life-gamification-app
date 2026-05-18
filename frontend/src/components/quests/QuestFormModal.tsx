import type { Dispatch, DragEvent, FormEvent, SetStateAction } from "react";
import { useMemo, useState } from "react";
import type { CreateQuestRequest, CreateQuestStepRequest, QuestResponse } from "../../api/types";
import { Button } from "../Button";
import { OptionChip } from "../OptionChip";
import { DateWheelInput, Field, QuestPlanWheelInput, TextArea, TextInput, TimeWheelInput } from "../FormFields";
import { ErrorLine } from "../Loader";
import { Modal } from "../Modal";
import { ModalOptionalFields } from "../ModalOptionalFields";
import { addDays } from "../../utils/calendarSchedule";
import { formatDate, formatTime, todayISO } from "../../utils/format";

interface QuestFormOptions {
  schedule: boolean;
  time: boolean;
  deadline: boolean;
  description: boolean;
  steps: boolean;
}

interface QuestFormModalProps {
  form: CreateQuestRequest;
  setForm: Dispatch<SetStateAction<CreateQuestRequest>>;
  editing: QuestResponse | null;
  options: QuestFormOptions;
  setOptions: Dispatch<SetStateAction<QuestFormOptions>>;
  formError: string | null;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

function generatedStepTitle(baseTitle: string, index: number) {
  const safeBase = baseTitle.trim() || "Шаг";
  return index === 0 ? safeBase : `${safeBase} ${index + 1}`;
}

function questRange(form: CreateQuestRequest) {
  const safeDuration = Math.max(1, Number(form.durationDays) || 1);
  return Array.from({ length: Math.min(safeDuration, 365) }, (_, index) => addDays(form.startDate || todayISO(), index));
}

function monthLabel(date: string) {
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return months[Math.max(0, Math.min(11, Number(date.slice(5, 7)) - 1))] ?? "";
}

function buildManualSteps(form: CreateQuestRequest, preserveDates = true, preserveTitles = true): CreateQuestStepRequest[] {
  const totalSteps = Math.max(1, Math.min(365, Number(form.totalSteps) || 1));
  const existing = form.steps ?? [];

  return Array.from({ length: totalSteps }, (_, index) => {
    const current = existing[index];
    return {
      title: preserveTitles ? current?.title ?? generatedStepTitle(form.baseStepTitle, index) : generatedStepTitle(form.baseStepTitle, index),
      description: null,
      baselineScheduledDate: preserveDates ? current?.baselineScheduledDate ?? null : null,
      plannedTime: current?.plannedTime ?? null,
      deadlineTime: current?.deadlineTime ?? null
    };
  });
}

function distributeManualSteps(form: CreateQuestRequest): CreateQuestStepRequest[] {
  const range = questRange(form);
  const totalSteps = Math.max(1, Math.min(365, Number(form.totalSteps) || 1));

  return buildManualSteps(form, false).map((step, index) => {
    const offset = totalSteps === 1 ? 0 : Math.round((index * (range.length - 1)) / (totalSteps - 1));
    return { ...step, baselineScheduledDate: range[offset] ?? form.startDate };
  });
}

function manualPlanError(form: CreateQuestRequest, range: string[]) {
  if (form.planMode !== "MANUAL") return null;

  const steps = buildManualSteps(form);
  const start = range[0] ?? form.startDate;
  const end = range[range.length - 1] ?? form.startDate;
  const missing = steps.filter((step) => !step.baselineScheduledDate).length;

  if (missing > 0) return `Назначь даты для всех шагов: осталось ${missing}`;
  if (steps.some((step) => step.baselineScheduledDate && step.baselineScheduledDate < todayISO())) return "В ручном плане нельзя выбрать прошлую дату";
  if (steps.some((step) => step.baselineScheduledDate && (step.baselineScheduledDate < start || step.baselineScheduledDate > end))) {
    return "Даты шагов должны быть внутри периода квеста";
  }
  return null;
}

/** Keeps the quest create/edit dialog isolated from the page state machine. */
export function QuestFormModal({
  form,
  setForm,
  editing,
  options,
  setOptions,
  formError,
  busy,
  onSubmit,
  onCancel
}: QuestFormModalProps) {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(0);
  const isManualMode = !editing && form.planMode === "MANUAL";
  const manualSteps = useMemo(() => buildManualSteps(form), [form]);
  const range = useMemo(() => questRange(form), [form.startDate, form.durationDays]);
  const planError = manualPlanError(form, range);
  const selectedManualStep = selectedStepIndex === null ? null : manualSteps[Math.min(selectedStepIndex, manualSteps.length - 1)] ?? null;
  const assignedCount = manualSteps.filter((step) => step.baselineScheduledDate).length;
  const [draggingStepIndex, setDraggingStepIndex] = useState<number | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  function patchManualStep(index: number, patch: Partial<CreateQuestStepRequest>) {
    setForm((current) => {
      const steps = buildManualSteps(current);
      steps[index] = { ...steps[index], ...patch };
      return { ...current, steps };
    });
  }

  function switchPlanMode(planMode: "AUTO" | "MANUAL") {
    setForm((current) => ({
      ...current,
      planMode,
      steps: planMode === "MANUAL" ? buildManualSteps(current) : []
    }));
    if (planMode === "MANUAL") {
      setOptions((state) => ({ ...state, schedule: false, steps: false, time: false, deadline: false, description: false }));
    }
  }

  function togglePlanMode() {
    switchPlanMode(form.planMode === "MANUAL" ? "AUTO" : "MANUAL");
  }

  function updateTotalSteps(value: number) {
    setSelectedStepIndex((current) => current === null ? null : Math.min(current, value - 1));
    setForm((current) => {
      const next = { ...current, totalSteps: value };
      return { ...next, steps: current.planMode === "MANUAL" ? buildManualSteps(next) : current.steps };
    });
  }

  function updateDurationDays(value: number) {
    setForm((current) => {
      const next = { ...current, durationDays: value };
      const end = addDays(next.startDate, value - 1);
      const steps = current.planMode === "MANUAL"
        ? buildManualSteps(next).map((step) => ({
            ...step,
            baselineScheduledDate: step.baselineScheduledDate && step.baselineScheduledDate <= end ? step.baselineScheduledDate : null
          }))
        : current.steps;
      return { ...next, steps };
    });
  }

  function updatePlanSize(value: { days: number; steps: number }) {
    updateDurationDays(value.days);
    updateTotalSteps(value.steps);
  }

  function updateStartDate(value: string | null) {
    const startDate = value || todayISO();
    setForm((current) => {
      const next = { ...current, startDate };
      const range = questRange(next);
      const start = range[0] ?? startDate;
      const end = range[range.length - 1] ?? startDate;
      const steps = current.planMode === "MANUAL"
        ? buildManualSteps(next).map((step) => ({
            ...step,
            baselineScheduledDate: step.baselineScheduledDate && step.baselineScheduledDate >= start && step.baselineScheduledDate <= end
              ? step.baselineScheduledDate
              : null
          }))
        : current.steps;
      return { ...next, steps };
    });
  }

  function updateBaseStepTitle(value: string) {
    setForm((current) => {
      const next = { ...current, baseStepTitle: value };
      return { ...next, steps: current.planMode === "MANUAL" ? buildManualSteps(next, true, false) : current.steps };
    });
  }

  function updateSelectedStepTitle(value: string) {
    if (selectedStepIndex === null) return;
    patchManualStep(Math.min(selectedStepIndex, manualSteps.length - 1), { title: value });
  }

  function assignSelectedStep(date: string) {
    if (selectedStepIndex === null) return;
    assignStepToDate(Math.min(selectedStepIndex, manualSteps.length - 1), date);
  }

  function assignStepToDate(index: number, date: string) {
    if (manualSteps.length === 0) return;
    const safeIndex = Math.max(0, Math.min(index, manualSteps.length - 1));
    patchManualStep(safeIndex, { baselineScheduledDate: date });
    setSelectedStepIndex(safeIndex);
  }

  function handleStepDragStart(event: DragEvent<HTMLButtonElement>, index: number) {
    setDraggingStepIndex(index);
    setSelectedStepIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    const rect = event.currentTarget.getBoundingClientRect();
    event.dataTransfer.setDragImage(event.currentTarget, rect.width / 2, rect.height / 2);
  }

  function handleManualPlanDragOver(event: DragEvent<HTMLElement>) {
    if (draggingStepIndex === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleDayDragOver(event: DragEvent<HTMLButtonElement>, date: string) {
    if (draggingStepIndex === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverDate(date);
  }

  function handleDayDrop(event: DragEvent<HTMLButtonElement>, date: string) {
    event.preventDefault();
    event.stopPropagation();
    const rawIndex = event.dataTransfer.getData("text/plain");
    const parsedIndex = rawIndex === "" ? Number.NaN : Number(rawIndex);
    const nextIndex = Number.isInteger(parsedIndex) ? parsedIndex : draggingStepIndex;
    if (nextIndex !== null) assignStepToDate(nextIndex, date);
    setDraggingStepIndex(null);
    setDragOverDate(null);
  }

  function clearDragState() {
    setDraggingStepIndex(null);
    setDragOverDate(null);
  }

  function fillManualPlanAutomatically() {
    setForm((current) => ({ ...current, steps: distributeManualSteps(current) }));
  }

  const topFields = (
    <div className="modal-form-grid quest-top-grid">
      <Field label="Название" className="modal-field">
        <TextInput
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          maxLength={160}
          required
          placeholder="Например: изучить Java за 30 дней"
        />
      </Field>
      {!editing ? (
        <Field label="Дата старта" className="modal-field">
          <DateWheelInput value={form.startDate} onChange={updateStartDate} />
        </Field>
      ) : null}
    </div>
  );

  return (
    <Modal
      title={editing ? "Изменить квест" : "Добавить квест"}
      eyebrow={editing ? "редактирование" : "новый квест"}
      headerSlot={!editing ? (
        <button
          type="button"
          className="option-chip quest-plan-mode-toggle"
          aria-label="Переключить режим планирования"
          onClick={togglePlanMode}
        >
          {form.planMode === "MANUAL" ? "Ручной план" : "Автоплан"}
        </button>
      ) : null}
      className="quest-modal"
      onClose={onCancel}
    >
      <form className={`modal-form quest-form-v2 ${isManualMode ? "quest-form-v2--manual" : ""}`} onSubmit={onSubmit}>
        {isManualMode ? (
          <>
            <div className="optional-toolbar quest-manual-toolbar">
              <OptionChip active={options.time || Boolean(form.plannedTime)} onClick={() => setOptions((state) => ({ ...state, time: !state.time }))}>
                {form.plannedTime ? `Время: ${formatTime(form.plannedTime)}` : "Время"}
              </OptionChip>
              <OptionChip active={options.deadline || Boolean(form.deadlineTime)} onClick={() => setOptions((state) => ({ ...state, deadline: !state.deadline }))}>
                {form.deadlineTime ? `Дедлайн: ${formatTime(form.deadlineTime)}` : "Дедлайн"}
              </OptionChip>
              <OptionChip active={options.description || Boolean(form.description)} onClick={() => setOptions((state) => ({ ...state, description: !state.description }))}>
                Описание
              </OptionChip>
            </div>

            {topFields}

            <ModalOptionalFields
              items={[
                {
                  id: "steps",
                  open: true,
                  wide: true,
                  children: (
                    <div className="quest-step-settings-row">
                      <Field label="План" className="modal-field">
                        <QuestPlanWheelInput days={Number(form.durationDays)} steps={Number(form.totalSteps)} onChange={updatePlanSize} />
                      </Field>
                      <Field label="Название шага" className="modal-field">
                        <TextInput value={form.baseStepTitle} onChange={(event) => updateBaseStepTitle(event.target.value)} maxLength={150} required />
                      </Field>
                    </div>
                  )
                },
                {
                  id: "time",
                  open: options.time,
                  children: (
                    <Field label="Плановое время" className="modal-field">
                      <TimeWheelInput value={form.plannedTime ?? null} onChange={(value) => setForm({ ...form, plannedTime: value })} />
                    </Field>
                  )
                },
                {
                  id: "deadline",
                  open: options.deadline,
                  children: (
                    <Field label="Дедлайн" className="modal-field">
                      <TimeWheelInput value={form.deadlineTime ?? null} onChange={(value) => setForm({ ...form, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" />
                    </Field>
                  )
                },
                {
                  id: "description",
                  open: options.description,
                  wide: true,
                  children: (
                    <Field label="Описание квеста" className="modal-field modal-field--wide">
                      <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                    </Field>
                  )
                }
              ]}
            />

            <section
              className={`quest-manual-plan ${draggingStepIndex !== null ? "is-dragging" : ""}`}
              aria-label="Ручной план шагов"
              onDragOver={handleManualPlanDragOver}
              onDrop={clearDragState}
            >
            <div className="quest-manual-plan-head">
              <div>
                <p className="eyebrow">ручной план</p>
                <strong>{assignedCount}/{manualSteps.length} назначено</strong>
              </div>
              <div className="quest-manual-selected">
                <TextInput
                  className="quest-manual-step-title-input"
                  value={selectedStepIndex === null ? "Шаг не выбран" : selectedManualStep?.title ?? ""}
                  disabled={selectedStepIndex === null}
                  maxLength={150}
                  aria-label="Название выбранного шага"
                  onChange={(event) => updateSelectedStepTitle(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
                />
                <small>{selectedManualStep?.baselineScheduledDate ? formatDate(selectedManualStep.baselineScheduledDate) : selectedStepIndex === null ? "Выбери шаг" : "Дата не выбрана"}</small>
              </div>
              <Button type="button" variant="thin" onClick={fillManualPlanAutomatically}>Заполнить</Button>
            </div>

            <div className="quest-manual-calendar" role="list" aria-label="Дни квеста">
              {range.map((date) => {
                const assigned = manualSteps.filter((step) => step.baselineScheduledDate === date).length;
                const selected = selectedManualStep?.baselineScheduledDate === date;
                return (
                  <button
                    type="button"
                    key={date}
                    className={`quest-manual-day ${selected ? "selected" : ""} ${assigned > 0 ? "has-steps" : ""} ${draggingStepIndex !== null ? "drop-ready" : ""} ${dragOverDate === date ? "drop-target" : ""}`}
                    onClick={() => assignSelectedStep(date)}
                    onDragOver={(event) => handleDayDragOver(event, date)}
                    onDragLeave={() => setDragOverDate((current) => current === date ? null : current)}
                    onDrop={(event) => handleDayDrop(event, date)}
                  >
                    <span>{Number(date.slice(8, 10))}</span>
                    <small>{monthLabel(date)}</small>
                    {assigned > 0 ? <b>{assigned}</b> : null}
                  </button>
                );
              })}
            </div>

            <div className="quest-manual-step-board">
              <div className="quest-manual-step-list" role="list" aria-label="Шаги квеста">
                {manualSteps.map((step, index) => (
                  <button
                    type="button"
                    role="listitem"
                    key={index}
                    className={`quest-route-node quest-manual-step ${selectedStepIndex === index ? "selected" : ""} ${step.baselineScheduledDate ? "assigned" : "unassigned"} ${draggingStepIndex === index ? "is-dragging" : ""}`}
                    title={step.title}
                    draggable
                    aria-grabbed={draggingStepIndex === index}
                    onClick={() => setSelectedStepIndex((current) => current === index ? null : index)}
                    onDragStart={(event) => handleStepDragStart(event, index)}
                    onDragEnd={clearDragState}
                  >
                    <span>{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>
            </section>
          </>
        ) : (
          <>
            <div className="optional-toolbar">
              <OptionChip active={options.time || Boolean(form.plannedTime)} onClick={() => setOptions((state) => ({ ...state, time: !state.time }))}>
                {form.plannedTime ? `Время: ${formatTime(form.plannedTime)}` : "Время"}
              </OptionChip>
              <OptionChip active={options.deadline || Boolean(form.deadlineTime)} onClick={() => setOptions((state) => ({ ...state, deadline: !state.deadline }))}>
                {form.deadlineTime ? `Дедлайн: ${formatTime(form.deadlineTime)}` : "Дедлайн"}
              </OptionChip>
              <OptionChip active={options.description || Boolean(form.description)} onClick={() => setOptions((state) => ({ ...state, description: !state.description }))}>
                Описание
              </OptionChip>
            </div>

            {topFields}

            <ModalOptionalFields
              items={[
                {
                  id: "steps",
                  open: Boolean(!editing),
                  wide: true,
                  children: (
                    <div className="quest-step-settings-row">
                      <Field label="План" className="modal-field">
                        <QuestPlanWheelInput days={Number(form.durationDays)} steps={Number(form.totalSteps)} onChange={updatePlanSize} />
                      </Field>
                      <Field label="Название шага" className="modal-field">
                        <TextInput
                          value={form.baseStepTitle}
                          onChange={(event) => updateBaseStepTitle(event.target.value)}
                          maxLength={150}
                          required={!editing}
                        />
                      </Field>
                    </div>
                  )
                },
                {
                  id: "time",
                  open: options.time,
                  children: (
                    <Field label="Плановое время" className="modal-field">
                      <TimeWheelInput value={form.plannedTime ?? null} onChange={(value) => setForm({ ...form, plannedTime: value })} />
                    </Field>
                  )
                },
                {
                  id: "deadline",
                  open: options.deadline,
                  children: (
                    <Field label="Дедлайн" className="modal-field">
                      <TimeWheelInput value={form.deadlineTime ?? null} onChange={(value) => setForm({ ...form, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" />
                    </Field>
                  )
                },
                {
                  id: "description",
                  open: options.description,
                  wide: true,
                  children: (
                    <Field label="Описание квеста" className="modal-field modal-field--wide">
                      <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                    </Field>
                  )
                }
              ]}
            />
          </>
        )}

        <ErrorLine error={formError || planError} />
        <div className="modal-actions">
          <Button disabled={busy || Boolean(planError)}>{busy ? "Сохраняем" : editing ? "Сохранить" : "Создать"}</Button>
          {editing ? <Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button> : null}
        </div>
      </form>
    </Modal>
  );
}
