import { useEffect, useState } from "react";
import { Button } from "./Button";

function formatTimer(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

const TIMER_PRESETS = [5, 15, 25, 45, 60];
const TIMER_RADIUS = 38;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

// Self-contained focus timer used on the today page without touching daily-plan state.
export function FocusTimer() {
  const [minutes, setMinutes] = useState(25);
  const total = minutes * 60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const [justFinished, setJustFinished] = useState(false);

  useEffect(() => {
    if (!running) setRemaining(total);
  }, [running, total]);

  useEffect(() => {
    if (!running) return undefined;
    const intervalId = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(intervalId);
          setRunning(false);
          setJustFinished(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [running]);

  useEffect(() => {
    if (!justFinished) return undefined;
    const t = window.setTimeout(() => setJustFinished(false), 3000);
    return () => window.clearTimeout(t);
  }, [justFinished]);

  const elapsed = total - remaining;
  const strokeDashoffset = TIMER_CIRCUMFERENCE * (1 - elapsed / total);

  function toggleRunning() {
    if (remaining === 0) {
      setRemaining(total);
      setRunning(true);
      setJustFinished(false);
      return;
    }
    setRunning((value) => !value);
  }

  function chooseMinutes(value: number) {
    const next = Math.min(240, Math.max(1, Math.round(value || 1)));
    setMinutes(next);
    setRunning(false);
    setJustFinished(false);
    setRemaining(next * 60);
  }

  const statusLabel = running ? "сессия идёт" : justFinished ? "✓ готово!" : `${minutes} мин`;

  return (
    <div className={`avatar-focus-timer ${running ? "timer-running" : ""} ${justFinished ? "timer-done" : ""}`} aria-label="Фокус-таймер">
      <div className="timer-ring-svg-wrap">
        <svg className="timer-ring-svg" viewBox="0 0 88 88" aria-hidden="true">
          <circle className="timer-ring-bg" cx="44" cy="44" r={TIMER_RADIUS} />
          <circle
            className="timer-ring-track"
            cx="44"
            cy="44"
            r={TIMER_RADIUS}
            strokeDasharray={TIMER_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: running ? "stroke-dashoffset 1.02s linear" : "stroke-dashoffset 0.38s cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
          {justFinished && (
            <circle className="timer-ring-done-pulse" cx="44" cy="44" r={TIMER_RADIUS} />
          )}
        </svg>
        <span className="timer-ring-label">{formatTimer(remaining)}</span>
      </div>
      <div className="timer-copy">
        <strong>Фокус</strong>
        <small className={justFinished ? "timer-done-text" : ""}>{statusLabel}</small>
      </div>
      <div className="timer-presets" aria-label="Длительность">
        {TIMER_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className={`timer-preset-btn ${minutes === p && !running ? "active" : ""}`}
            onClick={() => chooseMinutes(p)}
            disabled={running}
            title={`${p} минут`}
          >
            {p}
          </button>
        ))}
        <input
          className="timer-custom-input"
          type="number"
          min={1}
          max={240}
          value={minutes}
          onChange={(event) => chooseMinutes(Number(event.target.value))}
          disabled={running}
          aria-label="Своя длительность в минутах"
          title="Своё время"
        />
      </div>
      <div className="timer-actions">
        <Button type="button" variant="thin" onClick={toggleRunning}>{running ? "Пауза" : remaining === 0 ? "Снова" : "Старт"}</Button>
        <Button type="button" variant="ghost" className="timer-reset-button" onClick={() => { setRunning(false); setJustFinished(false); setRemaining(total); }}>Сброс</Button>
      </div>
    </div>
  );
}
