import { FormEvent, useState } from "react";
import { api } from "../api/http";
import type { CreateHabitRequest, HabitResponse } from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Field, TextArea, TextInput } from "../components/FormFields";
import { ErrorLine, Loader } from "../components/Loader";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";

const emptyForm: CreateHabitRequest = {
  title: "",
  description: "",
  difficulty: "MEDIUM"
};

export function HabitsPage() {
  const { data: habits, loading, error, reload } = useAsync(() => api.habits.list(), []);
  const { notify } = useToast();
  const [form, setForm] = useState<CreateHabitRequest>(emptyForm);
  const [editing, setEditing] = useState<HabitResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function edit(habit: HabitResponse) {
    setEditing(habit);
    setForm({ title: habit.title, description: habit.description ?? "", difficulty: "MEDIUM" });
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      difficulty: "MEDIUM"
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
    notify({ tone: "info", title: habit.active ? "Привычка поставлена на паузу" : "Привычка активирована" });
    await reload();
  }

  async function remove(habit: HabitResponse) {
    if (!window.confirm(`Удалить привычку «${habit.title}»?`)) return;
    await api.habits.delete(habit.id);
    notify({ tone: "danger", title: "Привычка удалена" });
    await reload();
  }

  return (
    <section className="page">
      <header className="page-header split-header compact-header">
        <div>
          <p className="eyebrow">повторяемые действия</p>
          <h1>Привычки</h1>
          <p className="muted">Активные привычки попадают в Today при запуске дня.</p>
        </div>
        <Button variant="ghost" onClick={() => reload()}>Обновить</Button>
      </header>

      <section className="section-line">
        <p className="eyebrow">{editing ? "редактирование" : "новая привычка"}</p>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Название">
            <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={160} />
          </Field>
          <Field label="Описание">
            <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          <ErrorLine error={formError} />
          <div className="form-actions">
            <Button disabled={busy}>{busy ? "Сохраняем" : editing ? "Сохранить" : "Создать привычку"}</Button>
            {editing ? <Button type="button" variant="ghost" onClick={resetForm}>Отмена</Button> : null}
          </div>
        </form>
      </section>

      <section className="section-line">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">список</p>
            <h2>{habits?.filter((habit) => habit.active).length ?? 0} активных</h2>
          </div>
        </div>
        {loading ? <Loader /> : <ErrorLine error={error} />}
        {!loading && habits?.length === 0 ? <EmptyState title="Привычек пока нет" text="Создай привычку и запусти день, чтобы увидеть её в Today." /> : null}
        <div className="line-list">
          {habits?.map((habit) => (
            <article className={`line-item ${habit.active ? "status-active" : "status-paused"}`} key={habit.id}>
              <div>
                <strong>{habit.title}</strong>
                <p className="muted">{habit.description || "Без описания"}</p>
              </div>
              <div className="item-tail wide-tail">
                <small>{habit.active ? "активна" : "на паузе"}</small>
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
