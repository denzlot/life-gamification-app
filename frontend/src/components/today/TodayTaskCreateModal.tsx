import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { CreateTaskRequest } from "../../api/types";
import { formatTime } from "../../utils/format";
import { Button } from "../Button";
import { Field, TextArea, TextInput, TimeWheelInput } from "../FormFields";
import { FormModal } from "../FormModal";
import { ErrorLine } from "../Loader";
import { OptionChip } from "../OptionChip";
import { ModalTwinTimeRow } from "../ModalTwinTimeRow";
import { RevealSection } from "../RevealSection";

export interface TodayTaskOptions {
  deadline: boolean;
  time: boolean;
  description: boolean;
}

interface TodayTaskCreateModalProps {
  today: string;
  taskForm: CreateTaskRequest;
  taskOptions: TodayTaskOptions;
  taskError: string | null;
  busy: boolean;
  setTaskForm: Dispatch<SetStateAction<CreateTaskRequest>>;
  setTaskOptions: Dispatch<SetStateAction<TodayTaskOptions>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

/** Compact task form for Today. It keeps create logic in the page, not inside the modal shell. */
export function TodayTaskCreateModal({
  today,
  taskForm,
  taskOptions,
  taskError,
  busy,
  setTaskForm,
  setTaskOptions,
  onSubmit,
  onClose
}: TodayTaskCreateModalProps) {
  return (
    <FormModal onClose={onClose}>
      <form
        className="form-grid task-form task-drawer unified-form compact-create-form ordered-form centered-task-form modal-form-card"
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label="Создание задачи"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-form-head">
          <div><p className="eyebrow">новая задача</p><strong>Добавить задачу</strong></div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <Field label="Название">
          <TextInput value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required maxLength={160} placeholder="Например: подготовить отчёт" />
        </Field>
        <Field label="Дата задачи">
          <TextInput type="date" value={taskForm.deadlineDate || today} onChange={(event) => setTaskForm({ ...taskForm, deadlineDate: event.target.value || today })} />
        </Field>
        <div className="optional-toolbar">
          <OptionChip active={taskOptions.time || Boolean(taskForm.plannedTime)} onClick={() => setTaskOptions((state) => ({ ...state, time: !state.time }))}>
            {taskForm.plannedTime ? `Время: ${formatTime(taskForm.plannedTime)}` : "Время"}
          </OptionChip>
          <OptionChip active={taskOptions.deadline || Boolean(taskForm.deadlineTime)} onClick={() => setTaskOptions((state) => ({ ...state, deadline: !state.deadline }))}>
            {taskForm.deadlineTime ? `Дедлайн: ${formatTime(taskForm.deadlineTime)}` : "Дедлайн"}
          </OptionChip>
          <OptionChip active={taskOptions.description || Boolean(taskForm.description)} onClick={() => setTaskOptions((state) => ({ ...state, description: !state.description }))}>
            Описание
          </OptionChip>
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
  );
}
