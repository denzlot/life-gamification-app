import { FormEvent, useState } from "react";
import { api } from "../api/http";
import type { CreateHabitRequest, HabitResponse } from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { OptionChip } from "../components/OptionChip";
import { DateWheelInput, Field, NumberInput, TextArea, TextInput, TimeWheelInput } from "../components/FormFields";
import { ErrorLine, Loader } from "../components/Loader";
import { Modal } from "../components/Modal";
import { ModalOptionalFields } from "../components/ModalOptionalFields";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { formatDate, formatTime, todayISO } from "../utils/format";

const allDays = [1, 2, 3, 4, 5, 6, 7];
const dayLabels: Record<number, string> = { 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Вс" };
const scheduleModes = [
  { value: "WEEKLY", label: "По дням" },
  { value: "MONTHLY", label: "Раз в месяц" },
  { value: "INTERVAL", label: "Раз в N дней" }
] as const;

const emptyForm: CreateHabitRequest = {
  title: "",
  description: "",
  plannedTime: "",
  deadlineTime: "",
  scheduleType: "WEEKLY",
  monthlyDay: 1,
  intervalDays: 2,
  intervalStartDate: todayISO(),
  scheduleDays: allDays
};

function formatSchedule(habit: HabitResponse) {
  if (habit.scheduleType === "MONTHLY") {
    return `раз в месяц, ${habit.monthlyDay ?? 1} число`;
  }
  if (habit.scheduleType === "INTERVAL") {
    const days = habit.intervalDays ?? 1;
    const start = habit.intervalStartDate ? ` с ${formatDate(habit.intervalStartDate)}` : "";
    return `каждые ${days} дн.${start}`;
  }
  const days = habit.scheduleDays;
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
  const { data: habits, setData: setHabits, loading, error, reload } = useAsync(() => api.habits.list(), []);
  const { notify } = useToast();
  const [form, setForm] = useState<CreateHabitRequest>(emptyForm);
  const [editing, setEditing] = useState<HabitResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [options, setOptions] = useState({ time: false, deadline: false, description: false });
  const [formOpen, setFormOpen] = useState(false);
  const [openDescriptionId, setOpenDescriptionId] = useState<number | null>(null);

  function edit(habit: HabitResponse) {
    setEditing(habit);
    setFormOpen(true);
    setForm({
      title: habit.title,
      description: habit.description ?? "",
      plannedTime: habit.plannedTime ?? "",
      deadlineTime: habit.deadlineTime ?? "",
      scheduleType: habit.scheduleType ?? "WEEKLY",
      monthlyDay: habit.monthlyDay ?? 1,
      intervalDays: habit.intervalDays ?? 2,
      intervalStartDate: habit.intervalStartDate ?? todayISO(),
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
      scheduleType: form.scheduleType ?? "WEEKLY",
      scheduleDays: form.scheduleDays?.length ? form.scheduleDays : allDays,
      monthlyDay: form.scheduleType === "MONTHLY" ? form.monthlyDay ?? 1 : null,
      intervalDays: form.scheduleType === "INTERVAL" ? form.intervalDays ?? 2 : null,
      intervalStartDate: form.scheduleType === "INTERVAL" ? form.intervalStartDate || todayISO() : null
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
    const updated = await api.habits.toggleActive(habit.id);
    setHabits((current) => current ? current.map((entry) => entry.id === habit.id ? updated : entry) : current);
    notify({ tone: "info", title: habit.active ? "Привычка на паузе" : "Привычка активна" });
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
        <div className="create-inline-actions">
          <Button type="button" onClick={openNewHabitForm} aria-expanded={formOpen}>
            {formOpen && !editing ? "Скрыть привычку" : "Добавить привычку"}
          </Button>
          <span className="create-action-hint">Автоматически появится в днях по выбранному расписанию.</span>
        </div>
      </header>

      {formOpen ? (
        <Modal title={editing ? "Изменить привычку" : "Добавить привычку"} eyebrow={editing ? "редактирование" : "новая привычка"} onClose={resetForm}>
            <form className="modal-form" onSubmit={submit}>
              <div className="optional-toolbar schedule-mode-toolbar" aria-label="Режим расписания">
                {scheduleModes.map((mode) => (
                  <OptionChip
                    key={mode.value}
                    active={(form.scheduleType ?? "WEEKLY") === mode.value}
                    onClick={() => setForm({ ...form, scheduleType: mode.value })}
                  >
                    {mode.label}
                  </OptionChip>
                ))}
              </div>

              <div className="optional-toolbar">
                <OptionChip active={options.time || Boolean(form.plannedTime)} onClick={() => setOptions((state) => ({ ...state, time: !state.time }))}>{form.plannedTime ? `Время: ${formatTime(form.plannedTime)}` : "Время"}</OptionChip>
                <OptionChip active={options.deadline || Boolean(form.deadlineTime)} onClick={() => setOptions((state) => ({ ...state, deadline: !state.deadline }))}>{form.deadlineTime ? `Дедлайн: ${formatTime(form.deadlineTime)}` : "Дедлайн"}</OptionChip>
                <OptionChip active={options.description || Boolean(form.description)} onClick={() => setOptions((state) => ({ ...state, description: !state.description }))}>Описание</OptionChip>
              </div>

              <div className="modal-form-grid">
                <Field label="Название" className="modal-field">
                  <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={160} placeholder="Например: выпить витамины" />
                </Field>
              </div>

              {(form.scheduleType ?? "WEEKLY") === "WEEKLY" ? (
                <div className="weekday-picker modal-weekday-picker" aria-label="Дни привычки">
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
              ) : null}

              <ModalOptionalFields
                items={[
                  {
                    id: "monthly-day",
                    open: form.scheduleType === "MONTHLY",
                    children: (
                      <Field label="День месяца" hint="Если такого дня нет, появится в последний день месяца." className="modal-field">
                        <NumberInput value={form.monthlyDay ?? 1} min={1} max={31} suffix="день" onChange={(monthlyDay) => setForm({ ...form, monthlyDay })} />
                      </Field>
                    )
                  },
                  {
                    id: "interval-days",
                    open: form.scheduleType === "INTERVAL",
                    children: (
                      <Field label="Каждые" className="modal-field">
                        <NumberInput value={form.intervalDays ?? 2} min={1} max={365} suffix="дн." onChange={(intervalDays) => setForm({ ...form, intervalDays })} />
                      </Field>
                    )
                  },
                  {
                    id: "interval-start",
                    open: form.scheduleType === "INTERVAL",
                    children: (
                      <Field label="Старт" className="modal-field">
                        <DateWheelInput value={form.intervalStartDate ?? todayISO()} onChange={(value) => setForm({ ...form, intervalStartDate: value || todayISO() })} />
                      </Field>
                    )
                  }
                ]}
              />

              <ModalOptionalFields
                items={[
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
                      <Field label="Описание" className="modal-field modal-field--wide">
                        <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                      </Field>
                    )
                  }
                ]}
              />

              <ErrorLine error={formError} />
              <div className="modal-actions">
                <Button disabled={busy}>{busy ? "Сохраняем" : editing ? "Сохранить" : "Создать"}</Button>
                {editing ? <Button type="button" variant="ghost" onClick={resetForm}>Отмена</Button> : null}
              </div>
            </form>
        </Modal>
      ) : null}

      <section className="section-line clean-section">
        <div className="section-title-row"><h2>{habits?.filter((habit) => habit.active).length ?? 0} активных</h2></div>
        {loading ? <Loader /> : <ErrorLine error={error} />}
        {!loading && habits?.length === 0 ? <EmptyState title="Привычек пока нет" text="Создай привычку и открой день." /> : null}
        <div className="line-list clean-list habit-list">
          {habits?.map((habit) => (
            <article className="line-item habit-list-row" key={habit.id}>
              <div className="habit-row-main">
                <div className="item-title-line habit-title-line">
                  <strong>{habit.title}</strong>
                </div>
                {habit.description ? (
                  <button
                    type="button"
                    className={`description-toggle ${openDescriptionId === habit.id ? "open" : ""}`}
                    onClick={() => setOpenDescriptionId((current) => current === habit.id ? null : habit.id)}
                    aria-expanded={openDescriptionId === habit.id}
                    aria-label={openDescriptionId === habit.id ? "Скрыть описание" : "Показать описание"}
                  >
                    ›
                  </button>
                ) : null}
                {openDescriptionId === habit.id && habit.description ? <p className="item-description">{habit.description}</p> : null}
              </div>
              <div className="habit-row-meta">
                <span>{formatSchedule(habit)}</span>
                {habit.plannedTime ? <span>{formatTime(habit.plannedTime)}</span> : null}
                {habit.deadlineTime ? <span>дедлайн {formatTime(habit.deadlineTime)}</span> : null}
              </div>
              <div className="item-tail wide-tail habit-row-actions">
                <Button variant="thin" className="quest-action-btn" onClick={() => edit(habit)}>Изменить</Button>
                <Button variant="thin" className={`quest-action-btn habit-pause-action ${habit.active ? "" : "is-paused"}`} onClick={() => toggle(habit)}>Пауза</Button>
                <Button variant="thin" className="quest-action-btn quest-action-btn--danger" onClick={() => remove(habit)}>Удалить</Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
