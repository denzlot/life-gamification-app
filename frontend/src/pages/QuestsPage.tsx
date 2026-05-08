import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import type {
  CreateQuestRequest,
  QuestResponse,
  QuestStepResponse,
  UpdateQuestStepRequest
} from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { FormModal } from "../components/FormModal";
import { DateWheelInput, Field, NumberWheelInput, TextArea, TextInput, TimeWheelInput } from "../components/FormFields";
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

interface QuestDayStats {
  total: number;
  pending: number;
}

interface QuestPaceInfo {
  tone: "behind" | "ahead" | "even";
  behind: number;
  ahead: number;
}

function shortStepWord(count: number) {
  const abs = Math.abs(count);
  if (abs % 10 === 1 && abs % 100 !== 11) return "шаг";
  if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) return "шага";
  return "шагов";
}

function dayWeight(date: string) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return day === 0 || day === 6 ? 1.35 : 1;
}

const routeScheduleCache = new Map<string, string[]>();

function plannedDatesForQuest(quest: QuestResponse) {
  const safeDuration = Math.max(1, quest.durationDays);
  const safeSteps = Math.max(1, quest.totalSteps);
  const cacheKey = `${quest.id}:${quest.startDate}:${safeDuration}:${safeSteps}`;
  const cached = routeScheduleCache.get(cacheKey);
  if (cached) return cached;

  const quotas = Array.from({ length: safeDuration }, () => 0);

  if (safeSteps <= safeDuration) {
    for (let index = 0; index < safeSteps; index += 1) {
      const offset = safeSteps === 1 ? 0 : Math.round((index * (safeDuration - 1)) / (safeSteps - 1));
      quotas[offset] += 1;
    }
  } else {
    quotas.fill(1);
    let extraSteps = safeSteps - safeDuration;

    while (extraSteps > 0) {
      let bestOffset = 0;
      let bestPressure = Number.POSITIVE_INFINITY;

      for (let offset = 0; offset < safeDuration; offset += 1) {
        const pressure = quotas[offset] / dayWeight(addDays(quest.startDate, offset));
        if (pressure < bestPressure) {
          bestPressure = pressure;
          bestOffset = offset;
        }
      }

      quotas[bestOffset] += 1;
      extraSteps -= 1;
    }
  }

  const result: string[] = [];
  quotas.forEach((count, offset) => {
    for (let step = 0; step < count; step += 1) {
      result.push(addDays(quest.startDate, offset));
    }
  });

  routeScheduleCache.set(cacheKey, result);
  if (routeScheduleCache.size > 50) {
    const firstKey = routeScheduleCache.keys().next().value;
    if (firstKey) routeScheduleCache.delete(firstKey);
  }
  return result;
}

function plannedDateForStep(quest: QuestResponse, stepNumber: number) {
  const dates = plannedDatesForQuest(quest);
  const safeIndex = Math.min(Math.max(stepNumber - 1, 0), dates.length - 1);
  return dates[safeIndex] ?? quest.startDate;
}

function expectedStepsByDate(quest: QuestResponse, date: string) {
  let expected = 0;
  for (let stepNumber = 1; stepNumber <= quest.totalSteps; stepNumber += 1) {
    if (plannedDateForStep(quest, stepNumber) <= date) expected += 1;
  }
  return expected;
}

function baseQuotaForDate(quest: QuestResponse, date: string) {
  let planned = 0;
  for (let stepNumber = 1; stepNumber <= quest.totalSteps; stepNumber += 1) {
    if (plannedDateForStep(quest, stepNumber) === date) planned += 1;
  }
  return Math.max(1, planned);
}

function computeQuestPace(quest: QuestResponse | null, steps: QuestStepResponse[]): QuestPaceInfo {
  if (!quest) return { tone: "even", behind: 0, ahead: 0 };

  const today = todayISO();
  const grouped = steps.reduce<Record<string, QuestDayStats>>((acc, step) => {
    const entry = acc[step.scheduledDate] ?? { total: 0, pending: 0 };
    entry.total += 1;
    if (step.status === "PENDING") entry.pending += 1;
    acc[step.scheduledDate] = entry;
    return acc;
  }, {});

  const completed = steps.filter((step) => step.status === "COMPLETED").length;
  const expectedToday = expectedStepsByDate(quest, today);
  const expectedBeforeToday = expectedStepsByDate(quest, addDays(today, -1));
  const overduePendingDebt = steps.filter((step) => step.status === "PENDING" && step.scheduledDate < today).length;
  const legacySkippedDebt = steps.filter((step) => step.status === "SKIPPED" && step.scheduledDate <= today).length;
  const lateDebt = Math.max(overduePendingDebt + legacySkippedDebt, Math.max(0, expectedBeforeToday - completed));

  const recoveryDebt = Object.entries(grouped)
    .filter(([date, stats]) => date >= today && stats.pending > 0 && stats.total > baseQuotaForDate(quest, date))
    .reduce((maxDebt, [date, stats]) => Math.max(maxDebt, stats.total - baseQuotaForDate(quest, date)), 0);

  const behind = Math.max(lateDebt, recoveryDebt);
  const ahead = Math.max(0, completed - expectedToday);
  return { tone: behind > 0 ? "behind" : ahead > 0 ? "ahead" : "even", behind, ahead };
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
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [options, setOptions] = useState({ schedule: false, time: false, deadline: false, description: false, steps: false });
  const [formOpen, setFormOpen] = useState(false);
  const [stepsView, setStepsView] = useState<"list" | "route">("list");

  const visibleQuests = useMemo(() => (quests ?? []).filter((quest) => showArchived ? quest.status === "ARCHIVED" : quest.status !== "ARCHIVED"), [quests, showArchived]);
  const selected = useMemo(() => visibleQuests.find((quest) => quest.id === selectedId) ?? null, [visibleQuests, selectedId]);

  useEffect(() => {
    const first = visibleQuests[0]?.id ?? null;
    if (!visibleQuests.some((quest) => quest.id === selectedId)) setSelectedId(first);
  }, [visibleQuests, selectedId]);

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
          status: editing.status
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

  async function archiveQuest(quest: QuestResponse) {
    if (!window.confirm(`Отправить квест «${quest.title}» в архив? Он исчезнет из активного списка, календаря и маршрутов, пока ты не вернёшь его из архива.`)) return;
    setBusy(true);
    try {
      await api.quests.update(quest.id, {
        title: quest.title,
        description: quest.description ?? null,
        plannedTime: quest.plannedTime ?? null,
        deadlineTime: quest.deadlineTime ?? null,
        status: "ARCHIVED"
      });
      notify({ tone: "info", title: "Квест в архиве" });
      if (selectedId === quest.id) setSelectedId(null);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function restoreQuest(quest: QuestResponse) {
    setBusy(true);
    try {
      await api.quests.update(quest.id, {
        title: quest.title,
        description: quest.description ?? null,
        plannedTime: quest.plannedTime ?? null,
        deadlineTime: quest.deadlineTime ?? null,
        status: "ACTIVE"
      });
      notify({ tone: "success", title: "Квест снова активен" });
      setShowArchived(false);
      setSelectedId(quest.id);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove(quest: QuestResponse) {
    if (!window.confirm(`Удалить квест «${quest.title}»? Если квест уже попадал в дневные планы, удаление будет отклонено: такой квест можно только отправить в архив.`)) return;
    setBusy(true);
    try {
      await api.quests.delete(quest.id);
      notify({ tone: "danger", title: "Квест удалён" });
      if (selectedId === quest.id) setSelectedId(null);
      await reload();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Квест не удалён",
        text: err instanceof Error ? err.message : "Квест с историей можно только архивировать."
      });
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
          <span className="create-action-hint">Квест разложится на шаги и появится в календарном маршруте.</span>
        </div>

        {formOpen ? (
          <FormModal onClose={cancelEdit}>
            <form className="form-grid unified-form quest-form compact-create-form create-drawer-form modal-form-card" onSubmit={submit} role="dialog" aria-modal="true" aria-label={editing ? "Редактирование квеста" : "Новый квест"} onMouseDown={(event) => event.stopPropagation()}>
              <div className="modal-form-head">
                <div><p className="eyebrow form-eyebrow">{editing ? "редактирование" : "новый квест"}</p><strong>{editing ? "Изменить квест" : "Добавить квест"}</strong></div>
                <button type="button" className="dialog-close" onClick={cancelEdit} aria-label="Закрыть">×</button>
              </div>
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
          </FormModal>
        ) : null}
      </section>

      <div className="two-col quests-col">
        <section className="section-line clean-section">
          <p className="eyebrow">список квестов</p>
          {loading ? <Loader /> : <ErrorLine error={error} />}
          <div className="archive-toggle-row">
            <Button type="button" variant="ghost" onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Показать активные" : "Архив"}</Button>
          </div>
          {!loading && visibleQuests.length === 0 ? <EmptyState title={showArchived ? "Архив пуст" : "Квестов пока нет"} text={showArchived ? "Архивные квесты будут здесь. Их можно вернуть в активные." : "Создай длинную цель и получи шаги по датам."} /> : null}
          <div className="line-list typed-list">
            {visibleQuests.map((quest) => (
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
                  {quest.status === "COMPLETED" ? null : quest.status === "ARCHIVED" ? (
                    <Button variant="thin" disabled={busy} onClick={(event) => { event.stopPropagation(); restoreQuest(quest); }}>Вернуть</Button>
                  ) : (
                    <Button variant="thin" disabled={busy} onClick={(event) => { event.stopPropagation(); archiveQuest(quest); }}>В архив</Button>
                  )}
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
              {selected?.description ? <p className="muted quest-description-line">{selected.description}</p> : null}
            </div>
            <Button type="button" variant="ghost" onClick={() => setStepsView((view) => view === "list" ? "route" : "list")}>
              {stepsView === "list" ? "Маршрут" : "Список шагов"}
            </Button>
          </div>
          {stepsLoading ? <Loader /> : null}
          {selected && steps.length === 0 && !stepsLoading ? <EmptyState title="Шаги не загружены" /> : null}
          <p className="muted quest-steps-hint">Можно переносить шаги на другой день вручную. Для сегодняшнего шага доступна кнопка «Отложить на завтра», а будущие шаги можно быстро вернуть на сегодня.</p>
          {stepsView === "route" ? (
            <QuestRouteView steps={steps} quest={selected} onSaved={reloadSteps} />
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


function addDays(date: string, delta: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + delta);
  return next.toISOString().slice(0, 10);
}

function statusTone(status: QuestStepResponse["status"]) {
  if (status === "COMPLETED") return "готово";
  if (status === "SKIPPED") return "сорвано";
  return "в пути";
}

function QuestRouteView({ steps, quest, onSaved }: { steps: QuestStepResponse[]; quest: QuestResponse | null; onSaved: () => Promise<void> }) {
  const [selectedStepId, setSelectedStepId] = useState<number | null>(steps[0]?.id ?? null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [form, setForm] = useState<UpdateQuestStepRequest>({
    title: steps[0]?.title ?? "",
    description: steps[0]?.description ?? "",
    scheduledDate: steps[0]?.scheduledDate ?? todayISO(),
    plannedTime: steps[0]?.plannedTime ?? "",
    deadlineTime: steps[0]?.deadlineTime ?? ""
  });

  useEffect(() => {
    if (!steps.some((step) => step.id === selectedStepId)) setSelectedStepId(steps[0]?.id ?? null);
  }, [steps, selectedStepId]);

  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? steps[0] ?? null;

  useEffect(() => {
    if (!selectedStep) return;
    setForm({
      title: selectedStep.title,
      description: selectedStep.description ?? "",
      scheduledDate: selectedStep.scheduledDate,
      plannedTime: selectedStep.plannedTime ?? "",
      deadlineTime: selectedStep.deadlineTime ?? ""
    });
    setEditingStepId(null);
  }, [selectedStep?.id]);

  const questTotal = quest?.totalSteps ?? steps.length;
  const completed = steps.filter((step) => step.status === "COMPLETED").length;
  const pace = computeQuestPace(quest, steps);
  const progress = questTotal ? pct(completed, questTotal) : 0;
  const paceLabel = pace.behind > 0
    ? `отставание: ${pace.behind} ${shortStepWord(pace.behind)}`
    : pace.ahead > 0
      ? `опережение: ${pace.ahead} ${shortStepWord(pace.ahead)}`
      : "по плану";

  async function shiftStep(step: QuestStepResponse, targetDate: string) {
    setBusyId(step.id);
    try {
      await api.quests.updateStep(step.id, {
        title: step.title,
        description: step.description ?? null,
        scheduledDate: targetDate,
        plannedTime: step.plannedTime ?? null,
        deadlineTime: step.deadlineTime ?? null
      });
      await onSaved();
    } finally {
      setBusyId(null);
    }
  }

  async function saveRouteEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStep) return;
    setBusyId(selectedStep.id);
    try {
      await api.quests.updateStep(selectedStep.id, {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        scheduledDate: form.scheduledDate,
        plannedTime: form.plannedTime || null,
        deadlineTime: form.deadlineTime || null
      });
      setEditingStepId(null);
      await onSaved();
    } finally {
      setBusyId(null);
    }
  }

  if (steps.length === 0) return null;

  return (
    <div className="quest-route-board polished-route-board redesigned-route-board">
      <div className="quest-route-head">
        <div>
          <p className="eyebrow">маршрут</p>
          <strong>{completed}/{questTotal || steps.length} пройдено</strong>
          {quest?.description ? <small className="route-quest-description">{quest.description}</small> : null}
        </div>
        <div className="quest-route-meter" aria-label={`Прогресс ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
        <span className={pace.tone === "behind" ? "route-alert" : "route-ok"}>{paceLabel}</span>
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
        <>
          <div className={`quest-route-focus status-${selectedStep.status.toLowerCase()}`}>
            <div>
              <span className="route-step-kicker">Шаг {selectedStep.stepNumber} · {statusTone(selectedStep.status)}</span>
              <strong>{selectedStep.title}</strong>
              <small>{formatDate(selectedStep.scheduledDate)}{selectedStep.plannedTime ? ` · ${formatTime(selectedStep.plannedTime)}` : ""}</small>
            </div>
            <div className="route-step-actions">
              {selectedStep.status === "PENDING" ? (
                <Button
                  variant="thin"
                  disabled={busyId === selectedStep.id}
                  onClick={() => shiftStep(selectedStep, selectedStep.scheduledDate === todayISO() ? addDays(todayISO(), 1) : todayISO())}
                >
                  {selectedStep.scheduledDate === todayISO() ? "Отложить на завтра" : "На сегодня"}
                </Button>
              ) : null}
              <Button type="button" variant="thin" onClick={() => setEditingStepId((current) => current === selectedStep.id ? null : selectedStep.id)}>
                {editingStepId === selectedStep.id ? "Скрыть" : "Изменить шаг"}
              </Button>
            </div>
          </div>

          {editingStepId === selectedStep.id ? (
            <form className="route-step-edit compact-create-form" onSubmit={saveRouteEdit}>
              <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={160} />
              <div className="route-step-edit-grid">
                <Field label="Дата"><DateWheelInput value={form.scheduledDate} onChange={(value) => setForm({ ...form, scheduledDate: value || selectedStep.scheduledDate })} allowClear={false} /></Field>
                <Field label="Время"><TimeWheelInput value={form.plannedTime ?? null} onChange={(value) => setForm({ ...form, plannedTime: value })} /></Field>
                <Field label="Дедлайн"><TimeWheelInput value={form.deadlineTime ?? null} onChange={(value) => setForm({ ...form, deadlineTime: value })} label="выбрать дедлайн" placeholder="Выбрать дедлайн" /></Field>
              </div>
              <TextArea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} placeholder="Описание шага" />
              <div className="form-actions route-edit-actions">
                <Button disabled={busyId === selectedStep.id || !form.title.trim()}>Сохранить</Button>
                <Button type="button" variant="ghost" onClick={() => setEditingStepId(null)}>Отмена</Button>
              </div>
            </form>
          ) : null}
        </>
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

  async function shiftStep(targetDate: string) {
    setBusy(true);
    try {
      await api.quests.updateStep(step.id, {
        title: step.title,
        description: step.description ?? null,
        scheduledDate: targetDate,
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
        {step.status === "PENDING" ? (
          <Button variant="thin" disabled={busy} onClick={() => shiftStep(step.scheduledDate === todayISO() ? addDays(todayISO(), 1) : todayISO())}>
            {step.scheduledDate === todayISO() ? "Отложить на завтра" : "На сегодня"}
          </Button>
        ) : null}
        <Button variant="thin" onClick={() => setEditing(true)}>Изменить шаг</Button>
      </div>
    </article>
  );
}
