import type { GameStats } from "../api/types";
import { pct } from "../utils/format";
import { hpStateLabel, normalizeHpState, xpForLevel, xpForNextLevel } from "../utils/hp";
import hpIcon from "../assets/hp-icon.svg";
import xpIcon from "../assets/xp-icon.svg";
import levelIcon from "../assets/level-icon.svg";
import streakIcon from "../assets/streak-icon.svg";
import shieldIcon from "../assets/shield-icon.svg";

function Metric({
  label,
  value,
  suffix,
  icon,
  tone
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon?: string;
  tone?: "hp" | "xp" | "neutral";
}) {
  return (
    <div className={`hud-metric ${tone ? `hud-stat-${tone}` : ""}`}>
      <span className="hud-label">{icon ? <img src={icon} alt="" className="hud-icon" /> : null}{label}</span>
      <span className="hud-value">
        {value}{suffix ? <span className="hud-suffix">{suffix}</span> : null}
      </span>
    </div>
  );
}

function unlockKindLabel(type: string) {
  if (type === "THEME") return "тема";
  if (type === "CHARACTER") return "персонаж";
  return "награда";
}

export function GameHud({ stats }: { stats?: GameStats | null }) {
  if (!stats) {
    return <div className="hud muted">Характеристики загружаются</div>;
  }

  const hpState = normalizeHpState(stats);
  const levelStart = xpForLevel(stats.level);
  const next = xpForNextLevel(stats.level);
  const hasNextLevel = next > levelStart;
  const current = Math.max(0, stats.xp - levelStart);
  const needed = hasNextLevel ? Math.max(1, next - levelStart) : 1;
  const xpProgress = hasNextLevel ? pct(current, needed) : 100;
  const hpProgress = pct(stats.hp, stats.maxHp);
  const nextUnlock = stats.unlocks
    ?.filter((unlock) => !unlock.unlocked)
    .sort((a, b) => a.requiredLevel - b.requiredLevel)[0];

  return (
    <div className="hud" aria-label="Характеристики персонажа">
      <div className="hud-level-row">
        <span>Level {stats.level}</span>
        <strong>{hasNextLevel ? `${current} / ${needed} XP` : `${stats.xp} XP`}</strong>
        <em>{hasNextLevel ? `до Level ${stats.level + 1}` : "верх шкалы"}</em>
      </div>

      <div className="hud-meter-stack">
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
      </div>

      <div className="hud-stat-strip">
        <Metric label="HP" value={`${stats.hp}/${stats.maxHp}`} icon={hpIcon} tone="hp" />
        <Metric label="XP всего" value={stats.xp} icon={xpIcon} tone="xp" />
        <Metric label="Уровень" value={stats.level} icon={levelIcon} tone="neutral" />
      </div>

      <div className="hud-stat-strip hud-stat-strip-secondary">
        <Metric label="Стрик" value={stats.streak} icon={streakIcon} />
        <Metric label="Щит" value={stats.streakShield ? "готов" : "нет"} icon={shieldIcon} />
        <Metric label="Щит на" value={stats.nextShieldAt} icon={shieldIcon} />
      </div>

      {nextUnlock ? (
        <p className="hud-unlock-line">
          <span>Следующий unlock</span>
          <strong>{nextUnlock.title}</strong>
          <em>{unlockKindLabel(nextUnlock.type)} на Level {nextUnlock.requiredLevel}</em>
        </p>
      ) : (
        <p className="hud-unlock-line is-complete">
          <span>Unlocks</span>
          <strong>все открыто</strong>
          <em>новые награды появятся в каталоге позже</em>
        </p>
      )}

      <p className="hud-note"><span className="status-dot" /> состояние: {hpStateLabel(hpState)}</p>
    </div>
  );
}
