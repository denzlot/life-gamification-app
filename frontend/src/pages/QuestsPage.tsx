import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import type {
  CreateQuestRequest,
  QuestResponse,
  QuestStatus,
  QuestStepResponse,
  UpdateQuestStepRequest
} from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Field, SelectInput, TextArea, TextInput } from "../components/FormFields";
import { ErrorLine, Loader } from "../components/Loader";
import { useAchievementWatcher } from "../context/AchievementContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { formatDate, pct, questStatusLabel, stepStatusLabel, todayISO } from "../utils/format";

const emptyQuest: CreateQuestRequest = {
  title: "",
  description: "",
  difficulty: "MEDIUM",
  startDate: todayISO(),
  durationDays: 30,
  totalSteps: 30,
  baseStepTitle: "Шаг",
  baseStepDescription: ""
};

export function QuestsPage() {
  const { data: quests, loading, error, reload } = useAsync(() => api.quests.list(), []);
  const { notify } = useToast();
  const { syncAchievements } = useAchievementWatcher();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [steps, setSteps] = useState<QuestStepResponse[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [form, setForm] = useState<CreateQuestRequest>(emptyQuest);
  const [editing, setEditing] = useState<QuestResponse | null>(null);
  const [editStatus, setEditStatus] = useState<QuestStatus>("ACTIVE");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selected = useMemo(() => quests?.find((quest) => quest.id === selectedId) ?? null, [quests, selectedId]);

  useEffect(() => {
    const first = quests?.[0]?.id ?? null;
    if (selectedId === null && first !== null) setSelectedId(first);
  }, [quests, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setSteps([]);
      return;
    }
    setStepsLoading(true);
    api.quests
      .steps(selectedId)
      .then(setSteps)
      .catch(() => setSteps([]))
      .finally(() => setStepsLoading(false));
  }, [selectedId]);

  function startEdit(quest: QuestResponse) {
    setEditing(quest);
    setEditStatus(quest.status);
    setForm({
      title: quest.title,
      description: quest.description ?? "",
      difficulty: "MEDIUM",
      startDate: quest.startDate,
      durationDays: quest.durationDays,
      totalSteps: quest.totalSteps,
      baseStepTitle: "Шаг",
      baseStepDescription: ""
    });
  }

  function cancelEdit() {
    setEditing(null);
    setEditStatus("ACTIVE");
    setForm(emptyQuest);
    setFormError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      if (editing) {
        await api.quests.update(editing.id, {
          title: form.title.trim(),
          description: form.description?.trim() || null,
          difficulty: "MEDIUM",
          status: editStatus
        });
        notify({ tone: "success", title: "Квест обновлён" });
      } else {
        const created = await api.quests.create({
          title: form.title.trim(),
          description: form.description?.trim() || null,
          difficulty: "MEDIUM",
          startDate: form.startDate,
          durationDays: Number(form.durationDays),
          totalSteps: Number(form.totalSteps),
          baseStepTitle: form.baseStepTitle.trim(),
          baseStepDescription: form.baseStepDescription?.trim() || null
        });
        setSelectedId(created.id);
        notify({ tone: "success", title: "Квест создан" });
      }
      cancelEdit();
      await reload();
      await syncAchievements(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Не удалось сохранить квест");
    } finally {
      setBusy(false);
    }
  }

  async function remove(quest: QuestResponse) {
    if (!window.confirm(`Удалить или архивировать квест «${quest.title}»?`)) return;
    setBusy(true);
    try {
      await api.quests.delete(quest.id);
      notify({ tone: "danger", title: "Квест удалён или архивирован" });
      if (selectedId === quest.id) setSelectedId(null);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function reloadSteps() {
    if (!selectedId) return;
    setSteps(await api.quests.steps(selectedId));
  }

  return (
    <section className="page">
      <header className="page-header split-header compact-header">
        <div>
          <p className="eyebrow">длинные цели</p>
          <h1>Квесты</h1>
          <p className="muted">Квест создаёт шаги по датам. Актуальные шаги попадают в Today.</p>
        </div>
        <Button variant="ghost" onClick={() => reload()}>Обновить</Button>
      </header>

      <section className="section-line">
        <p className="eyebrow">{editing ? "редактирование" : "новый квест"}</p>
        <form className="form-grid quest-form" onSubmit={submit}>
          <Field label="Название">
            <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={160} required />
          </Field>
          {editing ? (
            <Field label="Статус">
              <SelectInput value={editStatus} onChange={(event) => setEditStatus(event.target.value as QuestStatus)}>
                <option value="ACTIVE">Активен</option>
                <option value="COMPLETED">Завершён</option>
                <option value="ARCHIVED">Архив</option>
              </SelectInput>
            </Field>
          ) : (
            <>
              <Field label="Дата старта">
                <TextInput type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
              </Field>
              <Field label="Дней">
                <TextInput type="number" min={1} value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: Number(event.target.value) })} required />
              </Field>
              <Field label="Шагов">
                <TextInput type="number" min={1} max={365} value={form.totalSteps} onChange={(event) => setForm({ ...form, totalSteps: Number(event.target.value) })} required />
              </Field>
              <Field label="Базовое название шага">
                <TextInput value={form.baseStepTitle} onChange={(event) => setForm({ ...form, baseStepTitle: event.target.value })} maxLength={150} required />
              </Field>
              <Field label="Описание шага">
                <TextArea value={form.baseStepDescription ?? ""} onChange={(event) => setForm({ ...form, baseStepDescription: event.target.value })} />
              </Field>
            </>
          )}
          <Field label="Описание квеста">
            <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          <ErrorLine error={formError} />
          <div className="form-actions">
            <Button disabled={busy}>{busy ? "Сохраняем" : editing ? "Сохранить квест" : "Создать квест"}</Button>
            {editing ? <Button type="button" variant="ghost" onClick={cancelEdit}>Отмена</Button> : null}
          </div>
        </form>
      </section>

      <div className="two-col quests-col">
        <section className="section-line">
          <p className="eyebrow">список квестов</p>
          {loading ? <Loader /> : <ErrorLine error={error} />}
          {!loading && quests?.length === 0 ? <EmptyState title="Квестов пока нет" text="Создай длинную цель и получи шаги по датам." /> : null}
          <div className="line-list">
            {quests?.map((quest) => (
              <article className={`line-item clickable ${selectedId === quest.id ? "selected" : ""}`} key={quest.id} onClick={() => setSelectedId(quest.id)}>
                <div>
                  <strong>{quest.title}</strong>
                  <p className="muted">
                    {questStatusLabel(quest.status)} · {formatDate(quest.startDate)} — {formatDate(quest.targetDate)}
                  </p>
                </div>
                <div className="item-tail wide-tail">
                  <span>{quest.totalSteps} шагов</span>
                  <Button variant="thin" onClick={(event) => { event.stopPropagation(); startEdit(quest); }}>Изменить</Button>
                  <Button variant="danger" disabled={busy} onClick={(event) => { event.stopPropagation(); remove(quest); }}>Удалить</Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-line">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">шаги</p>
              <h2>{selected ? selected.title : "Квест не выбран"}</h2>
            </div>
            {selected ? <Button variant="ghost" onClick={reloadSteps}>Обновить шаги</Button> : null}
          </div>
          {stepsLoading ? <Loader /> : null}
          {selected && steps.length === 0 && !stepsLoading ? <EmptyState title="Шаги не загружены" /> : null}
          <div className="line-list step-list">
            {steps.map((step) => (
              <StepEditor key={step.id} step={step} questTotal={selected?.totalSteps ?? 0} onSaved={reloadSteps} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function StepEditor({ step, questTotal, onSaved }: { step: QuestStepResponse; questTotal: number; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateQuestStepRequest>({
    title: step.title,
    description: step.description ?? "",
    scheduledDate: step.scheduledDate
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({ title: step.title, description: step.description ?? "", scheduledDate: step.scheduledDate });
  }, [step]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.quests.updateStep(step.id, {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        scheduledDate: form.scheduledDate
      });
      setEditing(false);
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  const progress = questTotal ? pct(step.stepNumber, questTotal) : 0;

  if (editing) {
    return (
      <form className="line-item step-edit" onSubmit={save}>
        <div className="step-edit-fields">
          <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          <TextInput type="date" value={form.scheduledDate} onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })} required />
          <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </div>
        <div className="item-tail wide-tail">
          <Button variant="thin" disabled={busy}>Сохранить</Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Отмена</Button>
        </div>
      </form>
    );
  }

  return (
    <article className={`line-item quest-step status-${step.status.toLowerCase()}`}>
      <div>
        <strong>{step.stepNumber}. {step.title}</strong>
        <p className="muted">{stepStatusLabel(step.status)} · {formatDate(step.scheduledDate)} · маршрут {progress}%</p>
      </div>
      <div className="item-tail wide-tail">
        <span>{stepStatusLabel(step.status)}</span>
        <Button variant="thin" onClick={() => setEditing(true)}>Изменить шаг</Button>
      </div>
    </article>
  );
}
