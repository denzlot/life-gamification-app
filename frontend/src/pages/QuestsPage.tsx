import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import type { CreateQuestRequest, QuestResponse, QuestStepResponse } from "../api/types";
import { Button } from "../components/Button";
import { QuestFormModal } from "../components/quests/QuestFormModal";
import { QuestListPanel } from "../components/quests/QuestListPanel";
import { QuestStepsPanel } from "../components/quests/QuestStepsPanel";
import { useAchievementWatcher } from "../context/AchievementContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { todayISO } from "../utils/format";

const emptyQuest: CreateQuestRequest = {
  title: "",
  description: "",
  plannedTime: "",
  deadlineTime: "",
  startDate: todayISO(),
  durationDays: 30,
  totalSteps: 30,
  baseStepTitle: "Шаг",
  baseStepDescription: "",
  planMode: "AUTO",
  steps: []
};

const emptyQuestOptions = { schedule: false, time: false, deadline: false, description: false, steps: false };

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
  const [options, setOptions] = useState(emptyQuestOptions);
  const [formOpen, setFormOpen] = useState(false);
  const [stepsView, setStepsView] = useState<"list" | "route">("list");

  const visibleQuests = useMemo(
    () => (quests ?? []).filter((quest) => showArchived ? quest.status === "ARCHIVED" : quest.status !== "ARCHIVED"),
    [quests, showArchived]
  );
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

  function resetQuestForm() {
    setEditing(null);
    setForm(emptyQuest);
    setFormError(null);
    setOptions(emptyQuestOptions);
  }

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
      baseStepDescription: "",
      planMode: "AUTO",
      steps: []
    });
    setOptions({ schedule: false, time: Boolean(quest.plannedTime), deadline: Boolean(quest.deadlineTime), description: Boolean(quest.description), steps: false });
  }

  function cancelEdit() {
    resetQuestForm();
    setFormOpen(false);
  }

  function openNewQuestForm() {
    if (formOpen && !editing) {
      cancelEdit();
      return;
    }
    resetQuestForm();
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
        const manualSteps = form.planMode === "MANUAL"
          ? (form.steps ?? []).map((step) => ({
              title: step.title.trim(),
              description: step.description?.trim() || null,
              baselineScheduledDate: step.baselineScheduledDate,
              plannedTime: step.plannedTime || null,
              deadlineTime: step.deadlineTime || null
            }))
          : undefined;
        const created = await api.quests.create({
          title: form.title.trim(),
          description: form.description?.trim() || null,
          plannedTime: form.plannedTime || null,
          deadlineTime: form.deadlineTime || null,
          startDate: form.startDate,
          durationDays: Number(form.durationDays),
          totalSteps: Number(form.totalSteps),
          baseStepTitle: form.baseStepTitle.trim(),
          baseStepDescription: form.baseStepDescription?.trim() || null,
          steps: manualSteps
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
          <QuestFormModal
            form={form}
            setForm={setForm}
            editing={editing}
            options={options}
            setOptions={setOptions}
            formError={formError}
            busy={busy}
            onSubmit={submit}
            onCancel={cancelEdit}
          />
        ) : null}
      </section>

      <div className="two-col quests-col">
        <QuestListPanel
          quests={visibleQuests}
          loading={loading}
          error={error}
          showArchived={showArchived}
          selectedId={selectedId}
          busy={busy}
          onToggleArchived={() => setShowArchived((value) => !value)}
          onSelect={setSelectedId}
          onEdit={startEdit}
          onArchive={archiveQuest}
          onRestore={restoreQuest}
          onRemove={remove}
        />

        <QuestStepsPanel
          selected={selected}
          steps={steps}
          stepsLoading={stepsLoading}
          stepsView={stepsView}
          onToggleStepsView={() => setStepsView((view) => view === "list" ? "route" : "list")}
          onSaved={reloadSteps}
        />
      </div>
    </section>
  );
}
