import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { CreateTaskRequest } from "../../api/types";
import { Button } from "../Button";
import { OptionChip } from "../OptionChip";
import { Field, TextArea, TextInput, TimeWheelInput } from "../FormFields";
import { ErrorLine } from "../Loader";
import { Modal } from "../Modal";
import { ModalOptionalFields } from "../ModalOptionalFields";
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
        <Modal title={isFuture ? "Задача на выбранный день" : "Добавить задачу"} eyebrow="новая задача" onClose={() => setTaskDrawerOpen(false)}>
          <form className="modal-form" onSubmit={onSubmit}>
            <div className="optional-toolbar">
              <OptionChip active={taskOptions.time || Boolean(taskForm.plannedTime)} onClick={() => setTaskOptions((state) => ({ ...state, time: !state.time }))}>{taskForm.plannedTime ? `Время: ${formatTime(taskForm.plannedTime)}` : "Время"}</OptionChip>
              <OptionChip active={taskOptions.deadline || Boolean(taskForm.deadlineTime)} onClick={() => setTaskOptions((state) => ({ ...state, deadline: !state.deadline }))}>{taskForm.deadlineTime ? `Дедлайн: ${formatTime(taskForm.deadlineTime)}` : "Дедлайн"}</OptionChip>
              <OptionChip active={taskOptions.description || Boolean(taskForm.description)} onClick={() => setTaskOptions((state) => ({ ...state, description: !state.description }))}>Описание</OptionChip>
            </div>

            <div className="modal-form-grid">
              <Field label="Название" className="modal-field">
                <TextInput value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required maxLength={160} placeholder="Например: созвон с дизайнером" />
              </Field>
              <label className="field clean-field modal-field fixed-date-field">
                <span>Дата задачи</span>
                <div className="fixed-date-chip" aria-label={`Дата задачи: ${formatDate(date)}`}>{formatDate(date)}</div>
              </label>
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
      ) : null}
    </section>
  );
}
