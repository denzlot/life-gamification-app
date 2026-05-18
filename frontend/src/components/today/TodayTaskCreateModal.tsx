import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { CreateTaskRequest } from "../../api/types";
import { formatTime } from "../../utils/format";
import { Button } from "../Button";
import { DateWheelInput, Field, TextArea, TextInput, TimeWheelInput } from "../FormFields";
import { ErrorLine } from "../Loader";
import { Modal } from "../Modal";
import { ModalOptionalFields } from "../ModalOptionalFields";
import { OptionChip } from "../OptionChip";

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
    <Modal title="Добавить задачу" eyebrow="новая задача" onClose={onClose}>
      <form className="modal-form" onSubmit={onSubmit}>
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

        <div className="modal-form-grid">
          <Field label="Название" className="modal-field">
            <TextInput value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required maxLength={160} placeholder="Например: подготовить отчёт" />
          </Field>
          <Field label="Дата задачи" className="modal-field">
            <DateWheelInput value={taskForm.deadlineDate || today} onChange={(value) => setTaskForm({ ...taskForm, deadlineDate: value || today })} />
          </Field>
        </div>

        <ModalOptionalFields
          items={[
            {
              id: "time",
              open: taskOptions.time,
              children: (
                <Field label="Плановое время" className="modal-field">
                  <TimeWheelInput value={taskForm.plannedTime ?? null} onChange={(value) => setTaskForm({ ...taskForm, plannedTime: value })} />
                </Field>
              )
            },
            {
              id: "deadline",
              open: taskOptions.deadline,
              children: (
                <Field label="Дедлайн" className="modal-field">
                  <TimeWheelInput value={taskForm.deadlineTime ?? null} onChange={(value) => setTaskForm({ ...taskForm, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" />
                </Field>
              )
            },
            {
              id: "description",
              open: taskOptions.description,
              wide: true,
              children: (
                <Field label="Описание" className="modal-field modal-field--wide">
                  <TextArea value={taskForm.description ?? ""} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} />
                </Field>
              )
            }
          ]}
        />

        <ErrorLine error={taskError} />
        <div className="modal-actions"><Button disabled={busy || !taskForm.title.trim()}>{busy ? "Сохраняем" : "Создать"}</Button></div>
      </form>
    </Modal>
  );
}
