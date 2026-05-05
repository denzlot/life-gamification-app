import { useState } from "react";
import { api } from "../api/http";
import type { AdminUserResponse, UpdateGameStatsRequest, UserStatus } from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Field, SelectInput, TextInput } from "../components/FormFields";
import { ErrorLine, Loader } from "../components/Loader";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { userStatusLabel } from "../utils/format";

export function AdminPage() {
  const { data: users, loading, error, reload } = useAsync(() => api.admin.users(), []);
  const { notify } = useToast();

  async function onUpdated() {
    await reload();
    notify({ tone: "success", title: "Изменения сохранены" });
  }

  return (
    <section className="page">
      <header className="page-header split-header compact-header">
        <div>
          <p className="eyebrow">администрирование</p>
          <h1>Пользователи</h1>
          <p className="muted">Минимальная админка: статус пользователя и игровые характеристики.</p>
        </div>
        <Button variant="ghost" onClick={() => reload()}>Обновить</Button>
      </header>

      <section className="section-line">
        {loading ? <Loader /> : <ErrorLine error={error} />}
        {!loading && users?.length === 0 ? <EmptyState title="Пользователей нет" /> : null}
        <div className="admin-list">
          {users?.map((user) => <AdminUserRow user={user} key={user.id} onUpdated={onUpdated} />)}
        </div>
      </section>
    </section>
  );
}

function AdminUserRow({ user, onUpdated }: { user: AdminUserResponse; onUpdated: () => Promise<void> }) {
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [stats, setStats] = useState<UpdateGameStatsRequest>({ xp: user.xp, hp: user.hp, streak: user.streak });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveStatus() {
    setBusy(true);
    setError(null);
    try {
      await api.admin.updateStatus(user.id, { status });
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить статус");
    } finally {
      setBusy(false);
    }
  }

  async function saveStats() {
    setBusy(true);
    setError(null);
    try {
      await api.admin.updateGameStats(user.id, {
        xp: Number(stats.xp),
        hp: Number(stats.hp),
        streak: Number(stats.streak)
      });
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить характеристики");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="admin-row">
      <div className="admin-user-head">
        <span>#{user.id}</span>
        <strong>{user.username}</strong>
        <small>{user.role} · {userStatusLabel(user.status)} · уровень {user.level}</small>
      </div>

      <div className="admin-controls">
        <Field label="Статус">
          <SelectInput value={status} onChange={(event) => setStatus(event.target.value as UserStatus)}>
            <option value="ACTIVE">Активен</option>
            <option value="BANNED">Заблокирован</option>
          </SelectInput>
        </Field>
        <Button variant="thin" disabled={busy} onClick={saveStatus}>Сохранить статус</Button>
      </div>

      <div className="admin-controls stat-inputs">
        <Field label="XP"><TextInput type="number" value={stats.xp ?? ""} onChange={(event) => setStats({ ...stats, xp: Number(event.target.value) })} /></Field>
        <Field label="HP"><TextInput type="number" value={stats.hp ?? ""} onChange={(event) => setStats({ ...stats, hp: Number(event.target.value) })} /></Field>
        <Field label="Стрик"><TextInput type="number" value={stats.streak ?? ""} onChange={(event) => setStats({ ...stats, streak: Number(event.target.value) })} /></Field>
        <Button variant="thin" disabled={busy} onClick={saveStats}>Сохранить статы</Button>
      </div>
      <ErrorLine error={error} />
    </article>
  );
}
