import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { CreateQuestRequest, QuestResponse } from "../../api/types";
import { Button } from "../Button";
import { FormModal } from "../FormModal";
import { OptionChip } from "../OptionChip";
import { DateWheelInput, Field, NumberWheelInput, TextArea, TextInput, TimeWheelInput } from "../FormFields";
import { ErrorLine } from "../Loader";
import { ModalTwinTimeRow } from "../ModalTwinTimeRow";
import { RevealSection } from "../RevealSection";
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
  return (
    <FormModal onClose={onCancel}>
      <form
        className="form-grid unified-form quest-form compact-create-form create-drawer-form modal-form-card"
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

        <Field label="Название">
          <TextInput
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            maxLength={160}
            required
            placeholder="Например: изучить Java за 30 дней"
          />
        </Field>

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
              {`${form.totalSteps} шагов / ${form.durationDays} дней`}
            </OptionChip>
          ) : null}
        </div>

        <RevealSection open={Boolean(!editing && options.schedule)} className="option-reveal--wide">
          <Field label="Дата старта">
            <DateWheelInput value={form.startDate} onChange={(value) => setForm({ ...form, startDate: value || todayISO() })} allowClear={false} />
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
              <NumberWheelInput value={Number(form.durationDays)} min={1} max={365} suffix="дней" label="выбрать дни" onChange={(value) => setForm({ ...form, durationDays: value })} />
            </Field>
            <Field label="Шагов">
              <NumberWheelInput value={Number(form.totalSteps)} min={1} max={365} suffix="шагов" label="выбрать шаги" onChange={(value) => setForm({ ...form, totalSteps: value })} />
            </Field>
            <Field label="Название шага">
              <TextInput
                value={form.baseStepTitle}
                onChange={(event) => setForm({ ...form, baseStepTitle: event.target.value })}
                maxLength={150}
                required={Boolean(!editing && options.steps)}
              />
            </Field>
            <Field label="Описание шага">
              <TextArea value={form.baseStepDescription ?? ""} onChange={(event) => setForm({ ...form, baseStepDescription: event.target.value })} />
            </Field>
          </div>
        </RevealSection>

        <RevealSection open={options.description} className="option-reveal--wide">
          <Field label="Описание квеста">
            <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
        </RevealSection>

        <ErrorLine error={formError} />
        <div className="form-actions">
          <Button disabled={busy}>{busy ? "Сохраняем" : editing ? "Сохранить" : "Создать"}</Button>
          {editing ? <Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button> : null}
        </div>
      </form>
    </FormModal>
  );
}
