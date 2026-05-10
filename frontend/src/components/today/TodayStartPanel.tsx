import type { GameStats } from "../../api/types";
import { Avatar } from "../Avatar";
import { Button } from "../Button";
import { GameHud } from "../GameHud";

interface TodayStartPanelProps {
  busy: boolean;
  stats?: GameStats;
  onStartDay: () => void;
}

export function TodayStartPanel({ busy, stats, onStartDay }: TodayStartPanelProps) {
  return (
    <>
      <section className="section-line start-day-line clean-section center-open-day-panel">
        <Button onClick={onStartDay} disabled={busy}>{busy ? "Открываем" : "Открыть день"}</Button>
      </section>
      <section className="section-line clean-section today-pre-character-card">
        <div className="today-pre-avatar-slot">
          <Avatar stats={stats} compact />
        </div>
        <div className="today-pre-stats-slot">
          <p className="eyebrow">персонаж</p>
          <h2>Готов к дню</h2>
          <GameHud stats={stats} />
        </div>
      </section>
    </>
  );
}
