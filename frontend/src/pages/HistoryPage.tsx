import { useEffect, useState } from "react";
import { api } from "../api/http";
import type { HistoryPageResponse } from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorLine, Loader } from "../components/Loader";
import { actionLabel, formatDate, formatDateTime, signed, sourceLabel } from "../utils/format";

export function HistoryPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<HistoryPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.history
      .get(page, 20)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить историю"))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <section className="page">
      <header className="page-header split-header compact-header">
        <div>
          <p className="eyebrow">журнал действий</p>
          <h1>История</h1>
          <p className="muted">Записи ActivityLog: выполнение, провалы, сбросы и закрытые дни.</p>
        </div>
        <div className="header-actions">
          <Button variant="ghost" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Назад</Button>
          <Button variant="ghost" disabled={!data?.hasNext} onClick={() => setPage((value) => value + 1)}>Вперёд</Button>
        </div>
      </header>

      <section className="section-line">
        <div className="section-title-row">
          <span>Страница {data ? data.page + 1 : page + 1}</span>
          <span className="muted">{data?.totalElements ?? 0} записей</span>
        </div>
        {loading ? <Loader /> : <ErrorLine error={error} />}
        {!loading && data?.items.length === 0 ? <EmptyState title="История пуста" text="Выполни, провали, сбрось задачу или закрой день." /> : null}
        <div className="history-list">
          {data?.items.map((item) => (
            <article className={`history-item action-${String(item.action).toLowerCase()}`} key={item.id}>
              <div className="history-time">
                <span>#{item.id}</span>
                <small>{formatDateTime(item.createdAt)}</small>
              </div>
              <div>
                <strong>{actionLabel(item.action)}</strong>
                <p className="muted">
                  {item.title || "событие дня"} · {sourceLabel(item.sourceType)} · {formatDate(item.planDate)}
                </p>
              </div>
              <div className="history-deltas">
                <span>XP {signed(item.xpDelta)}</span>
                <span>HP {signed(item.hpDelta)}</span>
                <span>после: {item.xpAfter} XP / {item.hpAfter} HP</span>
                <span>стрик {item.streakAfter} · щит {item.streakShieldAfter ? "есть" : "нет"}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
