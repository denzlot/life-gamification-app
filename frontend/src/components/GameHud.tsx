import type { GameStats } from "../api/types";
import { pct } from "../utils/format";
import { hpStateLabel, normalizeHpState, xpForLevel, xpForNextLevel } from "../utils/hp";
import hpIcon from "../assets/hp-icon.svg";
import xpIcon from "../assets/xp-icon.svg";
import levelIcon from "../assets/level-icon.svg";
import streakIcon from "../assets/streak-icon.svg";
import shieldIcon from "../assets/shield-icon.svg";

function Stat({ label, value, suffix, icon, tone }: { label: string; value: string | number; suffix?: string; icon?: string; tone?: "hp" | "xp" | "neutral" }) {
  return (
    <div className={`hud-stat ${tone ? `hud-stat-${tone}` : ""}`}>
      <span className="hud-label">{icon ? <img src={icon} alt="" className="hud-icon" /> : null}{label}</span>
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
        <Stat label="Здоровье" value={`${stats.hp}/${stats.maxHp}`} icon={hpIcon} tone="hp" />
        <Stat label="Опыт" value={stats.xp} icon={xpIcon} tone="xp" />
        <Stat label="Уровень" value={stats.level} icon={levelIcon} tone="neutral" />
      </div>
      <div className="meter-row">
        <span className="meter-label"><img src={hpIcon} alt="" className="meter-icon" />HP</span>
        <div className="meter hp-meter"><span style={{ width: `${hpProgress}%` }} /></div>
        <b className="hp-value">{hpProgress}%</b>
      </div>
      <div className="meter-row">
        <span className="meter-label"><img src={xpIcon} alt="" className="meter-icon" />XP уровня</span>
        <div className="meter xp-meter"><span style={{ width: `${xpProgress}%` }} /></div>
        <b className="xp-value">{xpProgress}%</b>
      </div>
      <div className="hud-grid sub-stats">
        <Stat label="Стрик" value={stats.streak} icon={streakIcon} />
        <Stat label="Щит" value={stats.streakShield ? "есть" : "нет"} icon={shieldIcon} />
        <Stat label="След. щит" value={stats.nextShieldAt} icon={shieldIcon} />
      </div>
      <p className="hud-note"><span className="status-dot" /> состояние: {hpStateLabel(hpState)}</p>
    </div>
  );
}
