import type { DailyPlanItemStatus } from "../../api/types";
import { signed } from "../../utils/format";

type QualityHint = {
  tone: string;
  label: string;
  text: string;
};

function HpXpLine({ xp, hp }: { xp: number; hp: number }) {
  return (
    <span className="reward-line">
      <span className="xp-token">XP {signed(xp)}</span>
      <span className="hp-token">HP {signed(hp)}</span>
    </span>
  );
}

export function TodayPlanSummary({
  counts,
  completedPct,
  isClosed,
  xpEarned = 0,
  hpDelta = 0,
  qualityHint = null
}: {
  counts: Record<DailyPlanItemStatus, number>;
  completedPct: number;
  isClosed: boolean;
  xpEarned?: number | null;
  hpDelta?: number | null;
  qualityHint?: QualityHint | null;
}) {
  return (
    <div className="section-title-row plan-title-row compact-plan-title-row">
      <h2 className="inline-plan-title">
        Лист дня
        {qualityHint ? (
          <small className={`plan-quality-inline plan-quality-inline-${qualityHint.tone}`}>
            <b>{qualityHint.label}</b>
            <em>{qualityHint.text}</em>
          </small>
        ) : null}
        <span>выполнено {counts.COMPLETED} · в плане {counts.PENDING} · не выполнено {counts.FAILED}</span>
        {isClosed ? <HpXpLine xp={xpEarned ?? 0} hp={hpDelta ?? 0} /> : null}
      </h2>
      <div className="plan-progress">
        <strong>{completedPct}%</strong>
        <div className="meter"><span style={{ width: `${completedPct}%` }} /></div>
      </div>
    </div>
  );
}
