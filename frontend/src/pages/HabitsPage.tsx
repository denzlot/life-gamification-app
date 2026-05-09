import { FormEvent, useState } from "react";
import { api } from "../api/http";
import type { CreateHabitRequest, HabitResponse } from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { FormModal } from "../components/FormModal";
import { OptionChip } from "../components/OptionChip";
import { Field, TextArea, TextInput, TimeWheelInput } from "../components/FormFields";
import { ErrorLine, Loader } from "../components/Loader";
import { ModalTwinTimeRow } from "../components/ModalTwinTimeRow";
import { RevealSection } from "../components/RevealSection";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { formatTime } from "../utils/format";

const allDays = [1, 2, 3, 4, 5, 6, 7];
const dayLabels: Record<number, string> = { 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Вс" };

const emptyForm: CreateHabitRequest = {
  title: "",
  description: "",
  plannedTime: "",
  deadlineTime: "",
  scheduleDays: allDays
};

function formatSchedule(days?: number[]) {
  const normalized = days?.length ? days : allDays;
  if (normalized.length === 7) return "каждый день";
  return normalized.map((day) => dayLabels[day]).join(", ");
}

function toggleDay(days: number[] | undefined, day: number) {
  const current = days?.length ? days : allDays;
  const next = current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b);
  return next.length ? next : [day];
}

export function HabitsPage() {
  const { data: habits, loading, error, reload } = useAsync(() => api.habits.list(), []);
  const { notify } = useToast();
  const [form, setForm] = useState<CreateHabitRequest>(emptyForm);
  const [editing, setEditing] = useState<HabitResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [options, setOptions] = useState({ time: false, deadline: false, description: false });
  const [formOpen, setFormOpen] = useState(false);

  function edit(habit: HabitResponse) {
    setEditing(habit);
    setFormOpen(true);
    setForm({
      title: habit.title,
      description: habit.description ?? "",
      plannedTime: habit.plannedTime ?? "",
      deadlineTime: habit.deadlineTime ?? "",
      scheduleDays: habit.scheduleDays?.length ? habit.scheduleDays : allDays
    });
    setOptions({ time: Boolean(habit.plannedTime), deadline: Boolean(habit.deadlineTime), description: Boolean(habit.description) });
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setOptions({ time: false, deadline: false, description: false });
    setFormOpen(false);
  }

  function openNewHabitForm() {
    if (formOpen && !editing) {
      resetForm();
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setOptions({ time: false, deadline: false, description: false });
    setFormOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      plannedTime: form.plannedTime || null,
      deadlineTime: form.deadlineTime || null,
      scheduleDays: form.scheduleDays?.length ? form.scheduleDays : allDays
    };
    try {
      if (editing) await api.habits.update(editing.id, payload);
      else await api.habits.create(payload);
      notify({ tone: "success", title: editing ? "Привычка обновлена" : "Привычка создана" });
      resetForm();
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Не удалось сохранить привычку");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(habit: HabitResponse) {
    await api.habits.toggleActive(habit.id);
    notify({ tone: "info", title: habit.active ? "Привычка на паузе" : "Привычка активна" });
    await reload();
  }

  async function remove(habit: HabitResponse) {
    if (!window.confirm(`Удалить привычку «${habit.title}»?`)) return;
    await api.habits.delete(habit.id);
    notify({ tone: "danger", title: "Привычка удалена" });
    await reload();
  }

  return (
    <section className="page centered-page">
      <header className="page-header centered-title-header">
        <p className="eyebrow">привычки</p>
        <h1>Автоматические ритуалы</h1>
      </header>

      <section className="section-line entity-form-panel habit-designer-panel clean-section create-drawer-section">
        <div className="center-add-actions">
          <Button type="button" onClick={openNewHabitForm} aria-expanded={formOpen}>
            {formOpen && !editing ? "Скрыть привычку" : "Добавить привычку"}
          </Button>
          <span className="create-action-hint">Автоматически появится в днях по выбранному расписанию.</span>
        </div>

        {formOpen ? (
          <FormModal onClose={resetForm}>
            <form className="form-grid unified-form compact-create-form create-drawer-form modal-form-card" onSubmit={submit} role="dialog" aria-modal="true" aria-label={editing ? "Редактирование привычки" : "Новая привычка"} onMouseDown={(event) => event.stopPropagation()}>
              <div className="modal-form-head">
                <div><p className="eyebrow form-eyebrow">{editing ? "редактирование" : "новая привычка"}</p><strong>{editing ? "Изменить привычку" : "Добавить привычку"}</strong></div>
                <button type="button" className="dialog-close" onClick={resetForm} aria-label="Закрыть">×</button>
              </div>
            <Field label="Название">
              <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={160} placeholder="Например: выпить витамины" />
            </Field>

            <div className="weekday-picker" aria-label="Дни привычки">
              {allDays.map((day) => (
                <button
                  type="button"
                  key={day}
                  className={form.scheduleDays?.includes(day) ? "active" : ""}
                  onClick={() => setForm({ ...form, scheduleDays: toggleDay(form.scheduleDays, day) })}
                >
                  {dayLabels[day]}
                </button>
              ))}
            </div>

            <div className="optional-toolbar">
              <OptionChip active={options.time || Boolean(form.plannedTime)} onClick={() => setOptions((state) => ({ ...state, time: !state.time }))}>{form.plannedTime ? `Время: ${formatTime(form.plannedTime)}` : "Время"}</OptionChip>
              <OptionChip active={options.deadline || Boolean(form.deadlineTime)} onClick={() => setOptions((state) => ({ ...state, deadline: !state.deadline }))}>{form.deadlineTime ? `Дедлайн: ${formatTime(form.deadlineTime)}` : "Дедлайн"}</OptionChip>
              <OptionChip active={options.description || Boolean(form.description)} onClick={() => setOptions((state) => ({ ...state, description: !state.description }))}>Описание</OptionChip>
            </div>

            <ModalTwinTimeRow
              timeOpen={options.time}
              deadlineOpen={options.deadline}
              timeField={<Field label="Плановое время"><TimeWheelInput value={form.plannedTime ?? null} onChange={(value) => setForm({ ...form, plannedTime: value })} /></Field>}
              deadlineField={<Field label="Дедлайн"><TimeWheelInput value={form.deadlineTime ?? null} onChange={(value) => setForm({ ...form, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" /></Field>}
            />
            <RevealSection open={options.description} className="option-reveal--wide">
              <Field label="Описание"><TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            </RevealSection>

            <ErrorLine error={formError} />
            <div className="form-actions">
              <Button disabled={busy}>{busy ? "Сохраняем" : editing ? "Сохранить" : "Создать"}</Button>
              {editing ? <Button type="button" variant="ghost" onClick={resetForm}>Отмена</Button> : null}
            </div>
            </form>
          </FormModal>
        ) : null}
      </section>

      <section className="section-line clean-section">
        <div className="section-title-row"><h2>{habits?.filter((habit) => habit.active).length ?? 0} активных</h2></div>
        {loading ? <Loader /> : <ErrorLine error={error} />}
        {!loading && habits?.length === 0 ? <EmptyState title="Привычек пока нет" text="Создай привычку и открой день." /> : null}
        <div className="line-list typed-list clean-list">
          {habits?.map((habit) => (
            <article className={`line-item status-row ${habit.active ? "status-active" : "status-paused"}`} key={habit.id}>
              <div className="habit-row-main">
                <div className="item-title-line">
                  <strong>{habit.title}</strong>
                  <span className="item-type-badge">привычка</span>
                </div>
                <p className="muted compact-meta">
                  {formatSchedule(habit.scheduleDays)}{habit.plannedTime ? ` · ${formatTime(habit.plannedTime)}` : ""}{habit.deadlineTime ? ` · дедлайн ${formatTime(habit.deadlineTime)}` : ""}
                </p>
              </div>
              <div className="item-tail wide-tail">
                <small>{habit.active ? "активна" : "пауза"}</small>
                <Button variant="thin" onClick={() => edit(habit)}>Изменить</Button>
                <Button variant="thin" onClick={() => toggle(habit)}>{habit.active ? "Пауза" : "Активировать"}</Button>
                <Button variant="danger" onClick={() => remove(habit)}>Удалить</Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
