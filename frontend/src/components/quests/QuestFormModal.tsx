import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useMemo, useState } from "react";
import type { CreateQuestRequest, CreateQuestStepRequest, QuestResponse } from "../../api/types";
import { Button } from "../Button";
import { FormModal } from "../FormModal";
import { OptionChip } from "../OptionChip";
import { DateWheelInput, Field, NumberWheelInput, TextArea, TextInput, TimeWheelInput } from "../FormFields";
import { ErrorLine } from "../Loader";
import { ModalTwinTimeRow } from "../ModalTwinTimeRow";
import { RevealSection } from "../RevealSection";
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

function stepWord(count: number) {
  const abs = Math.abs(count);
  if (abs % 10 === 1 && abs % 100 !== 11) return "шаг";
  if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) return "шага";
  return "шагов";
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

function buildManualSteps(form: CreateQuestRequest, preserveDates = true): CreateQuestStepRequest[] {
  const totalSteps = Math.max(1, Math.min(365, Number(form.totalSteps) || 1));
  const existing = form.steps ?? [];

  return Array.from({ length: totalSteps }, (_, index) => {
    const current = existing[index];
    return {
      title: generatedStepTitle(form.baseStepTitle, index),
      description: form.baseStepDescription?.trim() || null,
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
      return { ...next, steps: current.planMode === "MANUAL" ? buildManualSteps(next) : current.steps };
    });
  }

  function updateBaseStepDescription(value: string) {
    setForm((current) => {
      const next = { ...current, baseStepDescription: value };
      return { ...next, steps: current.planMode === "MANUAL" ? buildManualSteps(next) : current.steps };
    });
  }

  function assignSelectedStep(date: string) {
    if (selectedStepIndex === null) return;
    patchManualStep(Math.min(selectedStepIndex, manualSteps.length - 1), { baselineScheduledDate: date });
  }

  function fillManualPlanAutomatically() {
    setForm((current) => ({ ...current, steps: distributeManualSteps(current) }));
  }

  return (
    <FormModal onClose={onCancel}>
      <form
        className={`form-grid unified-form quest-form compact-create-form create-drawer-form modal-form-card ${isManualMode ? "quest-form--manual" : ""}`}
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Редактирование квеста" : "Новый квест"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-form-head">
          <div>
            <p className="eyebrow form-eyebrow">{editing ? "редактирование" : "новый квест"}</p>
            <strong>{editing ? "Изменить квест" : "Добавить квест"}</strong>
          </div>
          <button type="button" className="dialog-close" onClick={onCancel} aria-label="Закрыть">×</button>
        </div>

        <Field label="Название" className="quest-title-field">
          <TextInput
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            maxLength={160}
            required
            placeholder="Например: изучить Java за 30 дней"
          />
        </Field>

        {!editing ? (
          <div className="quest-plan-mode-row" role="group" aria-label="Режим планирования">
            <OptionChip active={(form.planMode ?? "AUTO") === "AUTO"} onClick={() => switchPlanMode("AUTO")}>Автоплан</OptionChip>
            <OptionChip active={form.planMode === "MANUAL"} onClick={() => switchPlanMode("MANUAL")}>Ручной план</OptionChip>
          </div>
        ) : null}

        {isManualMode ? (
          <>
            <div className="optional-toolbar quest-manual-toolbar">
              <OptionChip active={options.schedule} onClick={() => setOptions((state) => ({ ...state, schedule: !state.schedule }))}>
                {`Старт: ${formatDate(form.startDate)}`}
              </OptionChip>
              <OptionChip active={options.steps} onClick={() => setOptions((state) => ({ ...state, steps: !state.steps }))}>
                {`${form.totalSteps} ${stepWord(Number(form.totalSteps))} / ${form.durationDays} дн.`}
              </OptionChip>
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

            <div className="quest-manual-controls">
              <div className="quest-manual-paired-reveals">
                <RevealSection open={options.schedule} className="quest-form-schedule-reveal quest-manual-reveal quest-manual-reveal--schedule">
                  <Field label="Дата старта">
                    <DateWheelInput value={form.startDate} onChange={updateStartDate} allowClear={false} />
                  </Field>
                </RevealSection>

                <RevealSection open={options.description} className="quest-form-description-reveal quest-manual-reveal quest-manual-reveal--description">
                  <Field label="Описание квеста" className="quest-compact-textarea-field">
                    <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                  </Field>
                </RevealSection>
              </div>

              <RevealSection open={options.steps} className="option-reveal--wide quest-manual-reveal quest-manual-reveal--steps">
                <div className="form-grid mini-form-grid">
                  <Field label="Дней">
                    <NumberWheelInput value={Number(form.durationDays)} min={1} max={365} suffix="дней" label="выбрать дни" onChange={updateDurationDays} />
                  </Field>
                  <Field label="Шагов">
                    <NumberWheelInput value={Number(form.totalSteps)} min={1} max={365} suffix="шагов" label="выбрать шаги" onChange={updateTotalSteps} />
                  </Field>
                  <Field label="Название шага">
                    <TextInput value={form.baseStepTitle} onChange={(event) => updateBaseStepTitle(event.target.value)} maxLength={150} required />
                  </Field>
                  <Field label="Описание шага" className="quest-compact-textarea-field">
                    <TextArea value={form.baseStepDescription ?? ""} onChange={(event) => updateBaseStepDescription(event.target.value)} />
                  </Field>
                </div>
              </RevealSection>

              <ModalTwinTimeRow
                timeOpen={options.time}
                deadlineOpen={options.deadline}
                timeField={(
                  <Field label="Плановое время">
                    <TimeWheelInput value={form.plannedTime ?? null} onChange={(value) => setForm({ ...form, plannedTime: value })} />
                  </Field>
                )}
                deadlineField={(
                  <Field label="Дедлайн">
                    <TimeWheelInput value={form.deadlineTime ?? null} onChange={(value) => setForm({ ...form, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" />
                  </Field>
                )}
              />
            </div>

            <section className="quest-manual-plan" aria-label="Ручной план шагов">
            <div className="quest-manual-plan-head">
              <div>
                <p className="eyebrow">ручной план</p>
                <strong>{assignedCount}/{manualSteps.length} назначено</strong>
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
                    className={`quest-manual-day ${selected ? "selected" : ""} ${assigned > 0 ? "has-steps" : ""}`}
                    onClick={() => assignSelectedStep(date)}
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
                    className={`quest-route-node quest-manual-step ${selectedStepIndex === index ? "selected" : ""} ${step.baselineScheduledDate ? "assigned" : "unassigned"}`}
                    title={step.title}
                    onClick={() => setSelectedStepIndex((current) => current === index ? null : index)}
                  >
                    <span>{index + 1}</span>
                  </button>
                ))}
              </div>
              <div className="quest-manual-selected">
                <strong>{selectedStepIndex === null ? "Шаг не выбран" : `${selectedStepIndex + 1}. ${selectedManualStep?.title}`}</strong>
                <small>{selectedManualStep?.baselineScheduledDate ? formatDate(selectedManualStep.baselineScheduledDate) : selectedStepIndex === null ? "Нажми шаг, затем дату" : "Дата не выбрана"}</small>
                <span>Дата назначается кликом по календарю</span>
              </div>
            </div>
            </section>
          </>
        ) : (
          <>
            <div className="optional-toolbar">
              {!editing ? (
                <OptionChip active={options.schedule} onClick={() => setOptions((state) => ({ ...state, schedule: !state.schedule }))}>
                  {`Старт: ${formatDate(form.startDate)}`}
                </OptionChip>
              ) : null}
              <OptionChip active={options.time || Boolean(form.plannedTime)} onClick={() => setOptions((state) => ({ ...state, time: !state.time }))}>
                {form.plannedTime ? `Время: ${formatTime(form.plannedTime)}` : "Время"}
              </OptionChip>
              <OptionChip active={options.deadline || Boolean(form.deadlineTime)} onClick={() => setOptions((state) => ({ ...state, deadline: !state.deadline }))}>
                {form.deadlineTime ? `Дедлайн: ${formatTime(form.deadlineTime)}` : "Дедлайн"}
              </OptionChip>
              <OptionChip active={options.description || Boolean(form.description)} onClick={() => setOptions((state) => ({ ...state, description: !state.description }))}>
                Описание
              </OptionChip>
              {!editing ? (
                <OptionChip active={options.steps} onClick={() => setOptions((state) => ({ ...state, steps: !state.steps }))}>
                  {`${form.totalSteps} ${stepWord(Number(form.totalSteps))} / ${form.durationDays} дн.`}
                </OptionChip>
              ) : null}
            </div>

            <RevealSection open={Boolean(!editing && options.schedule)} className="option-reveal--wide quest-form-schedule-reveal">
              <Field label="Дата старта">
                <DateWheelInput value={form.startDate} onChange={updateStartDate} allowClear={false} />
              </Field>
            </RevealSection>

            <RevealSection open={options.description} className="option-reveal--wide quest-form-description-reveal">
              <Field label="Описание квеста" className="quest-compact-textarea-field">
                <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </Field>
            </RevealSection>

            <ModalTwinTimeRow
              timeOpen={options.time}
              deadlineOpen={options.deadline}
              timeField={(
                <Field label="Плановое время">
                  <TimeWheelInput value={form.plannedTime ?? null} onChange={(value) => setForm({ ...form, plannedTime: value })} />
                </Field>
              )}
              deadlineField={(
                <Field label="Дедлайн">
                  <TimeWheelInput value={form.deadlineTime ?? null} onChange={(value) => setForm({ ...form, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" />
                </Field>
              )}
            />

            <RevealSection open={Boolean(!editing && options.steps)} className="option-reveal--wide">
              <div className="form-grid mini-form-grid">
                <Field label="Дней">
                  <NumberWheelInput value={Number(form.durationDays)} min={1} max={365} suffix="дней" label="выбрать дни" onChange={updateDurationDays} />
                </Field>
                <Field label="Шагов">
                  <NumberWheelInput value={Number(form.totalSteps)} min={1} max={365} suffix="шагов" label="выбрать шаги" onChange={updateTotalSteps} />
                </Field>
                <Field label="Название шага">
                  <TextInput
                    value={form.baseStepTitle}
                    onChange={(event) => updateBaseStepTitle(event.target.value)}
                    maxLength={150}
                    required={Boolean(!editing && options.steps)}
                  />
                </Field>
                <Field label="Описание шага" className="quest-compact-textarea-field">
                  <TextArea value={form.baseStepDescription ?? ""} onChange={(event) => updateBaseStepDescription(event.target.value)} />
                </Field>
              </div>
            </RevealSection>
          </>
        )}

        <ErrorLine error={formError || planError} />
        <div className="form-actions">
          <Button disabled={busy || Boolean(planError)}>{busy ? "Сохраняем" : editing ? "Сохранить" : "Создать"}</Button>
          {editing ? <Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button> : null}
        </div>
      </form>
    </FormModal>
  );
}
