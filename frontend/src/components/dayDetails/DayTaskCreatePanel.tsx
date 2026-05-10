import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { CreateTaskRequest } from "../../api/types";
import { Button } from "../Button";
import { FormModal } from "../FormModal";
import { OptionChip } from "../OptionChip";
import { Field, TextArea, TextInput, TimeWheelInput } from "../FormFields";
import { ErrorLine } from "../Loader";
import { ModalTwinTimeRow } from "../ModalTwinTimeRow";
import { RevealSection } from "../RevealSection";
import { formatDate, formatTime } from "../../utils/format";

interface TaskOptions {
  deadline: boolean;
  time: boolean;
  description: boolean;
}

interface DayTaskCreatePanelProps {
  date: string;
  isFuture: boolean;
  taskForm: CreateTaskRequest;
  setTaskForm: Dispatch<SetStateAction<CreateTaskRequest>>;
  taskOptions: TaskOptions;
  setTaskOptions: Dispatch<SetStateAction<TaskOptions>>;
  taskDrawerOpen: boolean;
  setTaskDrawerOpen: Dispatch<SetStateAction<boolean>>;
  taskError: string | null;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function DayTaskCreatePanel({
  date,
  isFuture,
  taskForm,
  setTaskForm,
  taskOptions,
  setTaskOptions,
  taskDrawerOpen,
  setTaskDrawerOpen,
  taskError,
  busy,
  onSubmit
}: DayTaskCreatePanelProps) {
  return (
    <section className="section-line task-create-panel drawer-host clean-section">
      <div className="section-title-row small-title-row">
        <h2>{isFuture ? "Добавить задачу на этот день" : "Добавить задачу"}</h2>
        <Button type="button" variant="ghost" onClick={() => setTaskDrawerOpen((value) => !value)}>{taskDrawerOpen ? "Скрыть" : "Добавить задачу"}</Button>
      </div>
      {taskDrawerOpen ? (
        <FormModal onClose={() => setTaskDrawerOpen(false)}>
          <form className="form-grid task-drawer unified-form compact-create-form modal-form-card day-task-create-form" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-label="Создание задачи" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-form-head">
              <div><p className="eyebrow">новая задача</p><strong>{isFuture ? "Задача на выбранный день" : "Добавить задачу"}</strong></div>
              <button type="button" className="dialog-close" onClick={() => setTaskDrawerOpen(false)} aria-label="Закрыть">×</button>
            </div>
            <Field label="Название">
              <TextInput value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required maxLength={160} placeholder="Например: созвон с дизайнером" />
            </Field>
            <label className="field clean-field fixed-date-field">
              <span>Дата задачи</span>
              <div className="fixed-date-chip" aria-label={`Дата задачи: ${formatDate(date)}`}>{formatDate(date)}</div>
            </label>
            <div className="optional-toolbar">
              <OptionChip active={taskOptions.time || Boolean(taskForm.plannedTime)} onClick={() => setTaskOptions((state) => ({ ...state, time: !state.time }))}>{taskForm.plannedTime ? `Время: ${formatTime(taskForm.plannedTime)}` : "Время"}</OptionChip>
              <OptionChip active={taskOptions.deadline || Boolean(taskForm.deadlineTime)} onClick={() => setTaskOptions((state) => ({ ...state, deadline: !state.deadline }))}>{taskForm.deadlineTime ? `Дедлайн: ${formatTime(taskForm.deadlineTime)}` : "Дедлайн"}</OptionChip>
              <OptionChip active={taskOptions.description || Boolean(taskForm.description)} onClick={() => setTaskOptions((state) => ({ ...state, description: !state.description }))}>Описание</OptionChip>
            </div>
            <ModalTwinTimeRow
              timeOpen={taskOptions.time}
              deadlineOpen={taskOptions.deadline}
              timeField={<Field label="Плановое время"><TimeWheelInput value={taskForm.plannedTime ?? null} onChange={(value) => setTaskForm({ ...taskForm, plannedTime: value })} /></Field>}
              deadlineField={<Field label="Дедлайн"><TimeWheelInput value={taskForm.deadlineTime ?? null} onChange={(value) => setTaskForm({ ...taskForm, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" /></Field>}
            />
            <RevealSection open={taskOptions.description} className="option-reveal--wide">
              <Field label="Описание"><TextArea value={taskForm.description ?? ""} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} /></Field>
            </RevealSection>
            <ErrorLine error={taskError} />
            <div className="form-actions"><Button disabled={busy || !taskForm.title.trim()}>{busy ? "Сохраняем" : "Создать"}</Button></div>
          </form>
        </FormModal>
      ) : null}
    </section>
  );
}
