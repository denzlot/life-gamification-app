import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { formatDate, formatTime, todayISO } from "../utils/format";

function pad(value: number) { return String(value).padStart(2, "0"); }
function clampNumber(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function clampDay(year: number, month: number, day: number) { return Math.min(day, new Date(year, month, 0).getDate()); }

function parseDate(value?: string | null) {
  const fallback = todayISO();
  const [year, month, day] = (value || fallback).split("-").map(Number);
  return {
    year: Number.isFinite(year) ? year : Number(fallback.slice(0, 4)),
    month: Number.isFinite(month) ? month : Number(fallback.slice(5, 7)),
    day: Number.isFinite(day) ? day : Number(fallback.slice(8, 10))
  };
}

function parseTime(value?: string | null) {
  const [hourRaw, minuteRaw] = (value || "09:00").split(":").map(Number);
  return {
    hour: Number.isFinite(hourRaw) ? clampNumber(hourRaw, 0, 23) : 9,
    minute: Number.isFinite(minuteRaw) ? clampNumber(minuteRaw, 0, 59) : 0
  };
}

type WheelOption<T extends string | number> = { value: T; label: string };
type PopoverPlacement = { isSheet: boolean; style: CSSProperties };

function viewportSize() {
  const visualViewport = window.visualViewport;
  return {
    width: visualViewport?.width ?? window.innerWidth,
    height: visualViewport?.height ?? window.innerHeight,
    offsetLeft: visualViewport?.offsetLeft ?? 0,
    offsetTop: visualViewport?.offsetTop ?? 0
  };
}

function getPopoverPlacement(trigger: HTMLElement, preferredWidth: number): PopoverPlacement {
  const viewport = viewportSize();
  const margin = 14;
  const gap = 8;

  if (viewport.width <= 640) {
    return {
      isSheet: true,
      style: {
        left: `${viewport.offsetLeft + margin}px`,
        right: `${margin}px`,
        bottom: `${margin}px`,
        maxHeight: `min(78vh, ${Math.max(320, viewport.height - margin * 2)}px)`
      }
    };
  }

  const rect = trigger.getBoundingClientRect();
  const width = Math.min(preferredWidth, viewport.width - margin * 2);
  const maxHeight = Math.min(440, viewport.height - margin * 2);
  const left = clampNumber(rect.left + viewport.offsetLeft, viewport.offsetLeft + margin, viewport.offsetLeft + viewport.width - width - margin);
  const belowTop = rect.bottom + viewport.offsetTop + gap;
  const aboveTop = rect.top + viewport.offsetTop - maxHeight - gap;
  const belowSpace = viewport.offsetTop + viewport.height - rect.bottom - margin;
  const top = belowSpace >= 300 || aboveTop < viewport.offsetTop + margin
    ? Math.min(belowTop, viewport.offsetTop + viewport.height - maxHeight - margin)
    : Math.max(viewport.offsetTop + margin, aboveTop);

  return { isSheet: false, style: { left: `${left}px`, top: `${top}px`, width: `${width}px`, maxHeight: `${maxHeight}px` } };
}

function useWheelPopover(open: boolean, triggerRef: RefObject<HTMLElement>, preferredWidth: number, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<PopoverPlacement>({ isSheet: false, style: {} });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function update() { if (triggerRef.current) setPlacement(getPopoverPlacement(triggerRef.current, preferredWidth)); }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [open, preferredWidth, triggerRef]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose();
    }
    function handleKeyDown(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, triggerRef]);

  return { panelRef, placement };
}

function WheelPopover({ open, triggerRef, preferredWidth, label, className, onClose, children }: {
  open: boolean;
  triggerRef: RefObject<HTMLElement>;
  preferredWidth: number;
  label: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { panelRef, placement } = useWheelPopover(open, triggerRef, preferredWidth, onClose);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className={`wheel-portal ${placement.isSheet ? "is-sheet" : "is-popover"}`}>
      {placement.isSheet ? <div className="wheel-scrim" aria-hidden="true" /> : null}
      <div ref={panelRef} className={`wheel-panel ${placement.isSheet ? "wheel-panel--sheet" : ""} ${className ?? ""}`} style={placement.style} role="dialog" aria-label={label}>
        {children}
      </div>
    </div>,
    document.body
  );
}

function WheelColumn<T extends string | number>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: WheelOption<T>[];
  onChange: (value: T) => void;
}) {
  const columnRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const safeLabel = String(label).replace(/\s+/g, "-");

  function alignSelected(behavior: ScrollBehavior = "smooth") {
    const container = columnRef.current;
    if (!container) return;
    const index = options.findIndex((option) => option.value === value);
    container.querySelector<HTMLButtonElement>(`[data-wheel-index="${index}"]`)?.scrollIntoView({ block: "center", behavior });
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => alignSelected("auto"), 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.length]);

  useEffect(() => {
    alignSelected("smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function selectNearestToCenter() {
    const container = columnRef.current;
    if (!container) return;
    const center = container.getBoundingClientRect().top + container.clientHeight / 2;
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button[data-wheel-index]"));
    const closest = buttons.reduce<HTMLButtonElement | null>((result, button) => {
      if (!result) return button;
      const currentDistance = Math.abs(button.getBoundingClientRect().top + button.offsetHeight / 2 - center);
      const previousDistance = Math.abs(result.getBoundingClientRect().top + result.offsetHeight / 2 - center);
      return currentDistance < previousDistance ? button : result;
    }, null);
    const next = closest ? options[Number(closest.dataset.wheelIndex)]?.value : undefined;
    if (next !== undefined && next !== value) onChange(next);
  }

  function handleScroll() {
    if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = window.setTimeout(selectNearestToCenter, 90);
  }

  function move(delta: number) {
    const index = options.findIndex((option) => option.value === value);
    const next = options[clampNumber(index + delta, 0, options.length - 1)]?.value;
    if (next !== undefined) onChange(next);
  }

  return (
    <div ref={columnRef} className="wheel-column" role="listbox" tabIndex={0} aria-label={label} aria-activedescendant={`wheel-option-${safeLabel}-${value}`} onScroll={handleScroll} onKeyDown={(event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
      if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
    }}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button type="button" key={String(option.value)} id={`wheel-option-${safeLabel}-${option.value}`} className={selected ? "selected" : ""} data-wheel-index={index} role="option" aria-selected={selected} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// Central wheel implementation for time, date and number fields.
// It renders through a fixed portal so modals/drawers/reveal sections cannot clip the picker.
export function TimeWheelInput({ value, onChange, placeholder = "Выбрать время", allowClear = true, label = "выбрать время" }: {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  label?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseTime(value));
  const hours = useMemo<WheelOption<number>[]>(() => Array.from({ length: 24 }, (_, index) => ({ value: index, label: pad(index) })), []);
  const minutes = useMemo<WheelOption<number>[]>(() => Array.from({ length: 60 }, (_, index) => ({ value: index, label: pad(index) })), []);
  useEffect(() => { if (open) setDraft(parseTime(value)); }, [open, value]);
  function apply() { onChange(`${pad(draft.hour)}:${pad(draft.minute)}`); setOpen(false); }
  function clear() { onChange(null); setOpen(false); }
  return (
    <div className="wheel-field">
      <button ref={triggerRef} type="button" className={`input wheel-trigger ${value ? "filled" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={() => setOpen((state) => !state)}>
        {value ? formatTime(value) : placeholder}
      </button>
      <WheelPopover open={open} triggerRef={triggerRef} preferredWidth={390} label={label} className="time-wheel" onClose={() => setOpen(false)}>
        <p className="eyebrow">{label}</p>
        <div className="wheel-preview"><span>{pad(draft.hour)}</span><b>:</b><span>{pad(draft.minute)}</span></div>
        <label className="wheel-manual-label"><span>Ввести вручную</span><input className="input wheel-manual-input" type="time" value={`${pad(draft.hour)}:${pad(draft.minute)}`} onChange={(event) => setDraft(parseTime(event.target.value))} /></label>
        <div className="wheel-columns two-columns"><WheelColumn label="Часы" value={draft.hour} options={hours} onChange={(hour) => setDraft((state) => ({ ...state, hour }))} /><WheelColumn label="Минуты" value={draft.minute} options={minutes} onChange={(minute) => setDraft((state) => ({ ...state, minute }))} /></div>
        <div className="wheel-actions">{allowClear ? <button type="button" className="btn btn-ghost" onClick={clear}>Очистить</button> : null}<button type="button" className="btn btn-primary" onClick={apply}>Применить</button></div>
      </WheelPopover>
    </div>
  );
}

export function DateWheelInput({ value, onChange, placeholder = "Выбрать дату", allowClear = true, label = "выбрать дату" }: {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  label?: string;
}) {
  const currentYear = new Date().getFullYear();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseDate(value));
  const months = useMemo(() => ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"], []);
  const years = useMemo<WheelOption<number>[]>(() => {
    const selectedYear = parseDate(value).year;
    const start = Math.min(currentYear - 2, selectedYear - 2);
    const end = Math.max(currentYear + 6, selectedYear + 2);
    return Array.from({ length: end - start + 1 }, (_, index) => { const year = start + index; return { value: year, label: String(year) }; });
  }, [currentYear, value]);
  const monthOptions = useMemo<WheelOption<number>[]>(() => months.map((month, index) => ({ value: index + 1, label: month })), [months]);
  const dayOptions = useMemo<WheelOption<number>[]>(() => Array.from({ length: new Date(draft.year, draft.month, 0).getDate() }, (_, index) => { const day = index + 1; return { value: day, label: pad(day) }; }), [draft.year, draft.month]);
  useEffect(() => { if (open) setDraft(parseDate(value)); }, [open, value]);
  function setYear(year: number) { setDraft((state) => ({ ...state, year, day: clampDay(year, state.month, state.day) })); }
  function setMonth(month: number) { setDraft((state) => ({ ...state, month, day: clampDay(state.year, month, state.day) })); }
  function apply() { onChange(`${draft.year}-${pad(draft.month)}-${pad(draft.day)}`); setOpen(false); }
  function clear() { onChange(null); setOpen(false); }
  return (
    <div className="wheel-field">
      <button ref={triggerRef} type="button" className={`input wheel-trigger ${value ? "filled" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={() => setOpen((state) => !state)}>{value ? formatDate(value) : placeholder}</button>
      <WheelPopover open={open} triggerRef={triggerRef} preferredWidth={430} label={label} className="date-wheel" onClose={() => setOpen(false)}>
        <p className="eyebrow">{label}</p>
        <div className="wheel-preview date-preview"><span>{pad(draft.day)}</span><span>{months[draft.month - 1]}</span><span>{draft.year}</span></div>
        <label className="wheel-manual-label"><span>Ввести вручную</span><input className="input wheel-manual-input" type="date" value={`${draft.year}-${pad(draft.month)}-${pad(draft.day)}`} onChange={(event) => setDraft(parseDate(event.target.value))} /></label>
        <div className="wheel-columns three-columns"><WheelColumn label="День" value={draft.day} options={dayOptions} onChange={(day) => setDraft((state) => ({ ...state, day }))} /><WheelColumn label="Месяц" value={draft.month} options={monthOptions} onChange={setMonth} /><WheelColumn label="Год" value={draft.year} options={years} onChange={setYear} /></div>
        <div className="wheel-actions">{allowClear ? <button type="button" className="btn btn-ghost" onClick={clear}>Очистить</button> : null}<button type="button" className="btn btn-primary" onClick={apply}>Применить</button></div>
      </WheelPopover>
    </div>
  );
}

export function NumberWheelInput({ value, onChange, min = 1, max = 60, step = 1, placeholder = "Выбрать число", label = "выбрать число", suffix = "" }: {
  value?: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  label?: string;
  suffix?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const safeStep = Math.max(1, step);
  const [draft, setDraft] = useState(() => clampNumber(value || min, min, max));
  const values = useMemo<WheelOption<number>[]>(() => {
    const entries: WheelOption<number>[] = [];
    for (let entry = min; entry <= max; entry += safeStep) entries.push({ value: entry, label: String(entry) });
    if (!entries.some((entry) => entry.value === max)) entries.push({ value: max, label: String(max) });
    return entries;
  }, [min, max, safeStep]);
  useEffect(() => { if (open) setDraft(clampNumber(value || min, min, max)); }, [open, value, min, max]);
  function apply() { onChange(clampNumber(draft, min, max)); setOpen(false); }
  return (
    <div className="wheel-field number-wheel-field">
      <button ref={triggerRef} type="button" className={`input wheel-trigger ${value ? "filled" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={() => setOpen((state) => !state)}>{value ? `${value}${suffix ? ` ${suffix}` : ""}` : placeholder}</button>
      <WheelPopover open={open} triggerRef={triggerRef} preferredWidth={320} label={label} className="number-wheel" onClose={() => setOpen(false)}>
        <p className="eyebrow">{label}</p>
        <div className="wheel-preview"><span>{draft}</span>{suffix ? <small>{suffix}</small> : null}</div>
        <label className="wheel-manual-label"><span>Ввести вручную</span><input className="input wheel-manual-input" type="number" min={min} max={max} step={safeStep} value={draft} onChange={(event) => setDraft(clampNumber(Number(event.target.value || min), min, max))} /></label>
        <div className="wheel-columns one-column"><WheelColumn label={label} value={draft} options={values} onChange={setDraft} /></div>
        <div className="wheel-actions single-action"><button type="button" className="btn btn-primary" onClick={apply}>Применить</button></div>
      </WheelPopover>
    </div>
  );
}
