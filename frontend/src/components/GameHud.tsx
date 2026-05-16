import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FocusEvent } from "react";
import type { GameStats } from "../api/types";
import { pct } from "../utils/format";
import { hpStateLabel, normalizeHpState, xpForLevel, xpForNextLevel } from "../utils/hp";
import hpIcon from "../assets/hp-icon.svg";
import xpIcon from "../assets/xp-icon.svg";
import streakIcon from "../assets/streak-icon.svg";
import shieldIcon from "../assets/shield-icon.svg";

function QuickStat({
  label,
  value,
  icon
}: {
  label: string;
  value: string | number;
  icon?: string;
}) {
  return (
    <div className="hud-quick-metric">
      <span className="hud-quick-label">
        {icon ? <img src={icon} alt="" className="hud-quick-icon" /> : null}
        {label}
      </span>
      <span className="hud-quick-value">{value}</span>
    </div>
  );
}

function unlockKindLabel(type: string) {
  if (type === "THEME") return "тема";
  if (type === "CHARACTER") return "персонаж";
  return "награда";
}

function GiftGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 11h16v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <path
        d="M12 11V22M9 11h6M9 11c0-2 1.8-4 3-4s3 2 3 4m3 0v3H5v-3"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HudNextUnlock({
  nextUnlock,
  allDone
}: {
  nextUnlock?: {
    title: string;
    type: string;
    requiredLevel: number;
  };
  allDone: boolean;
}) {
  const panelId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);

  const showPanel = hovered || focused || pinned;

  const close = useCallback(() => {
    setPinned(false);
    setHovered(false);
    setFocused(false);
    triggerRef.current?.blur();
  }, []);

  useEffect(() => {
    if (!pinned && !showPanel) return undefined;

    function onGlobalMouseDown(event: MouseEvent) {
      const node = anchorRef.current;
      if (!node || !(event.target instanceof Node) || node.contains(event.target)) return;
      setPinned(false);
      setHovered(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    }

    document.addEventListener("mousedown", onGlobalMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onGlobalMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, pinned, showPanel]);

  const labelDone = "Открытия: всё получено";
  const labelNext = `Следующее открытие: ${nextUnlock?.title ?? ""}`;

  function handleBlurTrigger(event: FocusEvent<HTMLButtonElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && anchorRef.current?.contains(next)) return;
    setFocused(false);
  }

  function handleClickTrigger() {
    const coarsePointer =
      typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (!coarsePointer) return;
    setPinned((value) => !value);
  }

  return (
    <div
      ref={anchorRef}
      className={`hud-unlock-anchor${showPanel ? " is-open" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        className="hud-unlock-trigger"
        aria-expanded={showPanel}
        aria-controls={panelId}
        aria-describedby={showPanel ? panelId : undefined}
        aria-label={allDone ? labelDone : labelNext}
        onFocus={() => setFocused(true)}
        onBlur={handleBlurTrigger}
        onClick={handleClickTrigger}
      >
        <GiftGlyph className="hud-unlock-glyph" />
      </button>

      <div
        id={panelId}
        role="region"
        aria-live="polite"
        className="hud-unlock-panel"
        hidden={!showPanel}
      >
        {allDone ? (
          <>
            <p className="hud-unlock-panel-title">Все открыто</p>
            <p className="hud-unlock-panel-meta">
              Новые награды появятся в каталоге позже.
            </p>
          </>
        ) : (
          <>
            <p className="hud-unlock-panel-title">{nextUnlock?.title}</p>
            <p className="hud-unlock-panel-meta">
              {unlockKindLabel(nextUnlock?.type ?? "")} · LVL {nextUnlock?.requiredLevel}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function HudProfileExtra({ stats }: { stats: GameStats }) {
  const hpState = normalizeHpState(stats);
  const unlocks = stats.unlocks ?? [];
  // Current unlock catalog pairs every character with a matching theme, so the
  // profile counts CHARACTER unlocks as one visual hero reward. If future rewards
  // are not theme/character pairs, keep them in standaloneUnlocks.
  const heroUnlocks = unlocks.filter((unlock) => unlock.type === "CHARACTER");
  const standaloneUnlocks = unlocks.filter((unlock) => unlock.type !== "CHARACTER" && unlock.type !== "THEME");
  const heroesLine = heroUnlocks.length > 0
    ? `${heroUnlocks.filter((unlock) => unlock.unlocked).length} / ${heroUnlocks.length}`
    : "—";
  const rewardsLine = standaloneUnlocks.length > 0
    ? `${standaloneUnlocks.filter((unlock) => unlock.unlocked).length} / ${standaloneUnlocks.length}`
    : "—";

  return (
    <div className="hud-quick-stats hud-profile-extra" aria-label="Дополнительно о прогрессе">
      <QuickStat label="Всего XP" value={stats.xp} icon={xpIcon} />
      <QuickStat label="Состояние" value={hpStateLabel(hpState)} icon={hpIcon} />
      <QuickStat label="Герои" value={heroesLine} />
      <QuickStat label="Награды" value={rewardsLine} />
    </div>
  );
}

export function GameHud({
  stats,
  layout = "default"
}: {
  stats?: GameStats | null;
  layout?: "default" | "profile";
}) {
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

  const shieldReady = stats.streakShield ? "готов" : "нет";
  const shieldDistance = Math.max(0, stats.nextShieldAt - stats.streak);

  return (
    <div className="hud" aria-label="Характеристики персонажа">
      <div className="hud-level-row">
        <span className="hud-level-tag">LVL {stats.level}</span>
        <strong>{hasNextLevel ? `${current} / ${needed} XP` : `${stats.xp} XP`}</strong>
        <span className="hud-level-tail">
          {hasNextLevel ? (
            <HudNextUnlock nextUnlock={nextUnlock} allDone={!nextUnlock} />
          ) : (
            <span className="hud-level-cap">верх шкалы</span>
          )}
        </span>
      </div>

      <div className="hud-meter-stack">
        <div className="meter-row">
          <span className="meter-label">
            <img src={hpIcon} alt="" className="meter-icon" />
            HP
          </span>
          <div className="meter hp-meter">
            <span style={{ width: `${hpProgress}%` }} />
          </div>
          <b className="hp-value">{hpProgress}%</b>
        </div>
        <div className="meter-row">
          <span className="meter-label">
            <img src={xpIcon} alt="" className="meter-icon" />
            XP уровня
          </span>
          <div className="meter xp-meter">
            <span style={{ width: `${xpProgress}%` }} />
          </div>
          <b className="xp-value">{xpProgress}%</b>
        </div>
      </div>

      {layout === "profile" ? <HudProfileExtra stats={stats} /> : null}

      <div className="hud-quick-stats">
        <QuickStat label="Стрик" value={stats.streak} icon={streakIcon} />
        <QuickStat label="Щит" value={shieldReady} icon={shieldIcon} />
        <QuickStat label="До щита" value={shieldDistance} icon={shieldIcon} />
      </div>

      <p className="hud-note">
        <span className="status-dot" /> состояние: {hpStateLabel(hpState)}
      </p>
    </div>
  );
}
