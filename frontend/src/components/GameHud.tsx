import type { GameStats } from "../api/types";
import { pct } from "../utils/format";
import { hpStateLabel, normalizeHpState, xpForLevel, xpForNextLevel } from "../utils/hp";

function Stat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="hud-stat">
      <span className="hud-label">{label}</span>
      <span className="hud-value">
        {value}{suffix ? <span className="hud-suffix">{suffix}</span> : null}
      </span>
    </div>
  );
}

export function GameHud({ stats }: { stats?: GameStats | null }) {
  if (!stats) {
    return <div className="hud muted">Характеристики загружаются</div>;
  }

  const hpState = normalizeHpState(stats);
  const levelStart = xpForLevel(stats.level);
  const next = xpForNextLevel(stats.level);
  const current = Math.max(0, stats.xp - levelStart);
  const needed = Math.max(1, next - levelStart);
  const xpProgress = pct(current, needed);
  const hpProgress = pct(stats.hp, stats.maxHp);

  return (
    <div className="hud" aria-label="Характеристики персонажа">
      <div className="hud-grid main-stats">
        <Stat label="Здоровье" value={`${stats.hp}/${stats.maxHp}`} />
        <Stat label="Опыт" value={stats.xp} />
        <Stat label="Уровень" value={stats.level} />
      </div>
      <div className="meter-row">
        <span>HP</span>
        <div className="meter hp-meter"><span style={{ width: `${hpProgress}%` }} /></div>
        <b>{hpProgress}%</b>
      </div>
      <div className="meter-row">
        <span>XP уровня</span>
        <div className="meter"><span style={{ width: `${xpProgress}%` }} /></div>
        <b>{xpProgress}%</b>
      </div>
      <div className="hud-grid sub-stats">
        <Stat label="Стрик" value={stats.streak} />
        <Stat label="Щит" value={stats.streakShield ? "есть" : "нет"} />
        <Stat label="След. щит" value={stats.nextShieldAt} />
      </div>
      <p className="hud-note"><span className="status-dot" /> состояние: {hpStateLabel(hpState)}</p>
    </div>
  );
}
