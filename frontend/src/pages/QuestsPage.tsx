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
import { DateWheelInput, Field, NumberWheelInput, SelectInput, TextArea, TextInput, TimeWheelInput } from "../components/FormFields";
import { ErrorLine, Loader } from "../components/Loader";
import { useAchievementWatcher } from "../context/AchievementContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { formatDate, formatTime, pct, questStatusLabel, stepStatusLabel, todayISO } from "../utils/format";

const emptyQuest: CreateQuestRequest = {
  title: "",
  description: "",
  plannedTime: "",
  deadlineTime: "",
  startDate: todayISO(),
  durationDays: 30,
  totalSteps: 30,
  baseStepTitle: "Шаг",
  baseStepDescription: ""
};

function OptionButton({ active, children, onClick }: { active?: boolean; children: string; onClick: () => void }) {
  return <button type="button" className={`option-chip ${active ? "active" : ""}`} onClick={onClick}>{children}</button>;
}

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
  const [options, setOptions] = useState({ schedule: false, time: false, deadline: false, description: false, steps: false });
  const [formOpen, setFormOpen] = useState(false);
  const [stepsView, setStepsView] = useState<"list" | "route">("list");

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
    setFormOpen(true);
    setEditStatus(quest.status);
    setForm({
      title: quest.title,
      description: quest.description ?? "",
      plannedTime: quest.plannedTime ?? "",
      deadlineTime: quest.deadlineTime ?? "",
      startDate: quest.startDate,
      durationDays: quest.durationDays,
      totalSteps: quest.totalSteps,
      baseStepTitle: "Шаг",
      baseStepDescription: ""
    });
    setOptions({ schedule: false, time: Boolean(quest.plannedTime), deadline: Boolean(quest.deadlineTime), description: Boolean(quest.description), steps: false });
  }

  function cancelEdit() {
    setEditing(null);
    setEditStatus("ACTIVE");
    setForm(emptyQuest);
    setFormError(null);
    setOptions({ schedule: false, time: false, deadline: false, description: false, steps: false });
    setFormOpen(false);
  }

  function openNewQuestForm() {
    if (formOpen && !editing) {
      cancelEdit();
      return;
    }
    setEditing(null);
    setEditStatus("ACTIVE");
    setForm(emptyQuest);
    setFormError(null);
    setOptions({ schedule: false, time: false, deadline: false, description: false, steps: false });
    setFormOpen(true);
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
          plannedTime: form.plannedTime || null,
          deadlineTime: form.deadlineTime || null,
          status: editStatus
        });
        notify({ tone: "success", title: "Квест обновлён" });
      } else {
        const created = await api.quests.create({
          title: form.title.trim(),
          description: form.description?.trim() || null,
          plannedTime: form.plannedTime || null,
          deadlineTime: form.deadlineTime || null,
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
    <section className="page centered-page">
      <header className="page-header centered-title-header">
        <p className="eyebrow">квесты</p>
        <h1>Длинные цели</h1>
      </header>

      <section className="section-line entity-form-panel clean-section create-drawer-section">
        <div className="center-add-actions">
          <Button type="button" onClick={openNewQuestForm} aria-expanded={formOpen}>
            {formOpen && !editing ? "Скрыть квест" : "Добавить квест"}
          </Button>
        </div>

        {formOpen ? (
          <form className="form-grid unified-form quest-form compact-create-form create-drawer-form" onSubmit={submit}>
            <p className="eyebrow form-eyebrow">{editing ? "редактирование" : "новый квест"}</p>
            <Field label="Название">
              <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={160} required placeholder="Например: изучить Java за 30 дней" />
            </Field>

            <div className="optional-toolbar">
              {!editing ? (
                <OptionButton active={options.schedule} onClick={() => setOptions((state) => ({ ...state, schedule: !state.schedule }))}>
                  {`Старт: ${formatDate(form.startDate)}`}
                </OptionButton>
              ) : null}
              <OptionButton active={options.time || Boolean(form.plannedTime)} onClick={() => setOptions((state) => ({ ...state, time: !state.time }))}>
                {form.plannedTime ? `Время: ${formatTime(form.plannedTime)}` : "Время"}
              </OptionButton>
              <OptionButton active={options.deadline || Boolean(form.deadlineTime)} onClick={() => setOptions((state) => ({ ...state, deadline: !state.deadline }))}>
                {form.deadlineTime ? `Дедлайн: ${formatTime(form.deadlineTime)}` : "Дедлайн"}
              </OptionButton>
              <OptionButton active={options.description || Boolean(form.description)} onClick={() => setOptions((state) => ({ ...state, description: !state.description }))}>
                Описание
              </OptionButton>
              {!editing ? (
                <OptionButton active={options.steps} onClick={() => setOptions((state) => ({ ...state, steps: !state.steps }))}>
                  {`${form.totalSteps} шагов / ${form.durationDays} дней`}
                </OptionButton>
              ) : null}
            </div>

            {editing ? (
              <Field label="Статус">
                <SelectInput value={editStatus} onChange={(event) => setEditStatus(event.target.value as QuestStatus)}>
                  <option value="ACTIVE">Активен</option>
                  <option value="COMPLETED">Завершён</option>
                  <option value="ARCHIVED">Архив</option>
                </SelectInput>
              </Field>
            ) : null}

            {!editing && options.schedule ? (
              <Field label="Дата старта">
                <DateWheelInput value={form.startDate} onChange={(value) => setForm({ ...form, startDate: value || todayISO() })} allowClear={false} />
              </Field>
            ) : null}

            {options.time ? (
              <Field label="Плановое время">
                <TimeWheelInput value={form.plannedTime ?? null} onChange={(value) => setForm({ ...form, plannedTime: value })} />
              </Field>
            ) : null}

            {options.deadline ? (
              <Field label="Дедлайн">
                <TimeWheelInput value={form.deadlineTime ?? null} onChange={(value) => setForm({ ...form, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" />
              </Field>
            ) : null}

            {!editing && options.steps ? (
              <div className="form-grid mini-form-grid">
                <Field label="Дней">
                  <NumberWheelInput value={Number(form.durationDays)} min={1} max={365} suffix="дней" label="выбрать дни" onChange={(value) => setForm({ ...form, durationDays: value })} />
                </Field>
                <Field label="Шагов">
                  <NumberWheelInput value={Number(form.totalSteps)} min={1} max={365} suffix="шагов" label="выбрать шаги" onChange={(value) => setForm({ ...form, totalSteps: value })} />
                </Field>
                <Field label="Название шага">
                  <TextInput value={form.baseStepTitle} onChange={(event) => setForm({ ...form, baseStepTitle: event.target.value })} maxLength={150} required />
                </Field>
                <Field label="Описание шага">
                  <TextArea value={form.baseStepDescription ?? ""} onChange={(event) => setForm({ ...form, baseStepDescription: event.target.value })} />
                </Field>
              </div>
            ) : null}

            {options.description ? (
              <Field label="Описание квеста">
                <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </Field>
            ) : null}

            <ErrorLine error={formError} />
            <div className="form-actions">
              <Button disabled={busy}>{busy ? "Сохраняем" : editing ? "Сохранить" : "Создать"}</Button>
              {editing ? <Button type="button" variant="ghost" onClick={cancelEdit}>Отмена</Button> : null}
            </div>
          </form>
        ) : null}
      </section>

      <div className="two-col quests-col">
        <section className="section-line clean-section">
          <p className="eyebrow">список квестов</p>
          {loading ? <Loader /> : <ErrorLine error={error} />}
          {!loading && quests?.length === 0 ? <EmptyState title="Квестов пока нет" text="Создай длинную цель и получи шаги по датам." /> : null}
          <div className="line-list typed-list">
            {quests?.map((quest) => (
              <article className={`line-item clickable ${selectedId === quest.id ? "selected" : ""}`} key={quest.id} onClick={() => setSelectedId(quest.id)}>
                <div className="quest-row-main">
                  <div className="item-title-line">
                    <strong>{quest.title}</strong>
                    <span className="item-type-badge">квест</span>
                  </div>
                  <p className="muted">
                    {questStatusLabel(quest.status)} · {formatDate(quest.startDate)} — {formatDate(quest.targetDate)}{quest.plannedTime ? ` · ${formatTime(quest.plannedTime)}` : ""}{quest.deadlineTime ? ` · дедлайн ${formatTime(quest.deadlineTime)}` : ""}
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

        <section className="section-line clean-section">
          <div className="section-title-row quest-steps-title-row">
            <div>
              <p className="eyebrow">шаги</p>
              <h2>{selected ? selected.title : "Квест не выбран"}</h2>
            </div>
            <Button type="button" variant="ghost" onClick={() => setStepsView((view) => view === "list" ? "route" : "list")}>
              {stepsView === "list" ? "Маршрут" : "Список шагов"}
            </Button>
          </div>
          {stepsLoading ? <Loader /> : null}
          {selected && steps.length === 0 && !stepsLoading ? <EmptyState title="Шаги не загружены" /> : null}
          <p className="muted quest-steps-hint">Можно переносить шаги на другой день вручную. Если хочешь опередить план, нажми «На сегодня», затем открой Today и отметь шаг выполненным.</p>
          {stepsView === "route" ? (
            <QuestRouteView steps={steps} questTotal={selected?.totalSteps ?? 0} onSaved={reloadSteps} />
          ) : (
            <div className="line-list step-list typed-list quest-steps-list">
              {steps.map((step) => (
                <StepEditor key={step.id} step={step} questTotal={selected?.totalSteps ?? 0} onSaved={reloadSteps} />
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}


function statusTone(status: QuestStepResponse["status"]) {
  if (status === "COMPLETED") return "готово";
  if (status === "SKIPPED") return "сорвано";
  return "в пути";
}

function QuestRouteView({ steps, questTotal, onSaved }: { steps: QuestStepResponse[]; questTotal: number; onSaved: () => Promise<void> }) {
  const [selectedStepId, setSelectedStepId] = useState<number | null>(steps[0]?.id ?? null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!steps.some((step) => step.id === selectedStepId)) setSelectedStepId(steps[0]?.id ?? null);
  }, [steps, selectedStepId]);

  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? steps[0] ?? null;
  const completed = steps.filter((step) => step.status === "COMPLETED").length;
  const skipped = steps.filter((step) => step.status === "SKIPPED").length;
  const progress = questTotal ? pct(completed, questTotal) : 0;

  async function moveToToday(step: QuestStepResponse) {
    setBusyId(step.id);
    try {
      await api.quests.updateStep(step.id, {
        title: step.title,
        description: step.description ?? null,
        scheduledDate: todayISO(),
        plannedTime: step.plannedTime ?? null,
        deadlineTime: step.deadlineTime ?? null
      });
      await onSaved();
    } finally {
      setBusyId(null);
    }
  }

  if (steps.length === 0) return null;

  return (
    <div className="quest-route-board">
      <div className="quest-route-head">
        <div>
          <p className="eyebrow">маршрут</p>
          <strong>{completed}/{questTotal || steps.length} пройдено</strong>
        </div>
        <div className="quest-route-meter" aria-label={`Прогресс ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
        {skipped ? <span className="route-alert">сорвано {skipped}</span> : <span className="route-ok">темп живой</span>}
      </div>

      <div className="quest-route-track" role="list" aria-label="Маршрут шагов квеста">
        {steps.map((step) => (
          <button
            type="button"
            role="listitem"
            key={step.id}
            className={`quest-route-node status-${step.status.toLowerCase()} ${selectedStep?.id === step.id ? "selected" : ""}`}
            onClick={() => setSelectedStepId(step.id)}
            title={`${step.stepNumber}. ${step.title}`}
          >
            <span>{step.stepNumber}</span>
          </button>
        ))}
      </div>

      {selectedStep ? (
        <div className={`quest-route-focus status-${selectedStep.status.toLowerCase()}`}>
          <div>
            <span className="route-step-kicker">Шаг {selectedStep.stepNumber} · {statusTone(selectedStep.status)}</span>
            <strong>{selectedStep.title}</strong>
            <small>{formatDate(selectedStep.scheduledDate)}{selectedStep.plannedTime ? ` · ${formatTime(selectedStep.plannedTime)}` : ""}</small>
          </div>
          {selectedStep.status === "PENDING" && selectedStep.scheduledDate !== todayISO() ? (
            <Button variant="thin" disabled={busyId === selectedStep.id} onClick={() => moveToToday(selectedStep)}>На сегодня</Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StepEditor({ step, questTotal, onSaved }: { step: QuestStepResponse; questTotal: number; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateQuestStepRequest>({
    title: step.title,
    description: step.description ?? "",
    scheduledDate: step.scheduledDate,
    plannedTime: step.plannedTime ?? "",
    deadlineTime: step.deadlineTime ?? ""
  });
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState({ date: false, time: false, deadline: false, description: false });

  useEffect(() => {
    setForm({ title: step.title, description: step.description ?? "", scheduledDate: step.scheduledDate, plannedTime: step.plannedTime ?? "", deadlineTime: step.deadlineTime ?? "" });
    setOptions({ date: false, time: Boolean(step.plannedTime), deadline: Boolean(step.deadlineTime), description: Boolean(step.description) });
  }, [step]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.quests.updateStep(step.id, {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        scheduledDate: form.scheduledDate,
        plannedTime: form.plannedTime || null,
        deadlineTime: form.deadlineTime || null
      });
      setEditing(false);
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function moveToToday() {
    setBusy(true);
    try {
      await api.quests.updateStep(step.id, {
        title: step.title,
        description: step.description ?? null,
        scheduledDate: todayISO(),
        plannedTime: step.plannedTime ?? null,
        deadlineTime: step.deadlineTime ?? null
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  const progress = questTotal ? pct(step.stepNumber, questTotal) : 0;

  if (editing) {
    return (
      <form className="line-item step-edit compact-create-form" onSubmit={save}>
        <div className="step-edit-fields">
          <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          <div className="optional-toolbar">
            <OptionButton active={options.date} onClick={() => setOptions((state) => ({ ...state, date: !state.date }))}>{`Дата: ${formatDate(form.scheduledDate)}`}</OptionButton>
            <OptionButton active={options.time || Boolean(form.plannedTime)} onClick={() => setOptions((state) => ({ ...state, time: !state.time }))}>{form.plannedTime ? `Время: ${formatTime(form.plannedTime)}` : "Время"}</OptionButton>
            <OptionButton active={options.deadline || Boolean(form.deadlineTime)} onClick={() => setOptions((state) => ({ ...state, deadline: !state.deadline }))}>{form.deadlineTime ? `Дедлайн: ${formatTime(form.deadlineTime)}` : "Дедлайн"}</OptionButton>
            <OptionButton active={options.description || Boolean(form.description)} onClick={() => setOptions((state) => ({ ...state, description: !state.description }))}>Описание</OptionButton>
          </div>
          {options.date ? <DateWheelInput value={form.scheduledDate} onChange={(value) => setForm({ ...form, scheduledDate: value || step.scheduledDate })} allowClear={false} /> : null}
          {options.time ? <TimeWheelInput value={form.plannedTime ?? null} onChange={(value) => setForm({ ...form, plannedTime: value })} /> : null}
          {options.deadline ? <TimeWheelInput value={form.deadlineTime ?? null} onChange={(value) => setForm({ ...form, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" /> : null}
          {options.description ? <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /> : null}
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
      <div className="quest-step-main">
        <div className="item-title-line">
          <strong>{step.stepNumber}. {step.title}</strong>
          <span className="item-type-badge">шаг</span>
        </div>
        <p className="muted">
          {stepStatusLabel(step.status)} · {formatDate(step.scheduledDate)}{step.plannedTime ? ` · ${formatTime(step.plannedTime)}` : ""}{step.deadlineTime ? ` · дедлайн ${formatTime(step.deadlineTime)}` : ""} · маршрут {progress}%
        </p>
      </div>
      <div className="item-tail wide-tail">
        <span>{stepStatusLabel(step.status)}</span>
        {step.status === "PENDING" && step.scheduledDate !== todayISO() ? <Button variant="thin" disabled={busy} onClick={moveToToday}>На сегодня</Button> : null}
        <Button variant="thin" onClick={() => setEditing(true)}>Изменить шаг</Button>
      </div>
    </article>
  );
}
