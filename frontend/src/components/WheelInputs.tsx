import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, RefObject, WheelEvent as ReactWheelEvent } from "react";
import { createPortal } from "react-dom";
import { WheelPicker, WheelPickerWrapper, type WheelPickerOption, type WheelPickerValue } from "@ncdai/react-wheel-picker";
import { formatDate, formatTime, todayISO } from "../utils/format";

function pad(value: number) { return String(value).padStart(2, "0"); }
function clampNumber(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

function parseTime(value?: string | null) {
  const [hourRaw, minuteRaw] = (value || "09:00").split(":").map(Number);
  return {
    hour: Number.isFinite(hourRaw) ? clampNumber(hourRaw, 0, 23) : 9,
    minute: Number.isFinite(minuteRaw) ? clampNumber(minuteRaw, 0, 59) : 0
  };
}

type DateParts = { year: number; month: number; day: number };
type PopoverPlacement = { isSheet: boolean; style: CSSProperties };

const WHEEL_VISIBLE_COUNT = 16;
const WHEEL_ITEM_HEIGHT = 28;
const WHEEL_DRAG_SENSITIVITY = 4.2;
const WHEEL_SCROLL_SENSITIVITY = 12;
const MONTH_OPTIONS: WheelPickerOption<number>[] = [
  { value: 1, label: "янв" },
  { value: 2, label: "фев" },
  { value: 3, label: "мар" },
  { value: 4, label: "апр" },
  { value: 5, label: "май" },
  { value: 6, label: "июн" },
  { value: 7, label: "июл" },
  { value: 8, label: "авг" },
  { value: 9, label: "сен" },
  { value: 10, label: "окт" },
  { value: 11, label: "ноя" },
  { value: 12, label: "дек" }
];

function viewportSize() {
  const visualViewport = window.visualViewport;
  return {
    width: visualViewport?.width ?? window.innerWidth,
    height: visualViewport?.height ?? window.innerHeight,
    offsetLeft: visualViewport?.offsetLeft ?? 0,
    offsetTop: visualViewport?.offsetTop ?? 0
  };
}

function getPopoverPlacement(trigger: HTMLElement, preferredWidth: number, matchTriggerWidth: boolean): PopoverPlacement {
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
  const width = Math.min(matchTriggerWidth ? rect.width : preferredWidth, viewport.width - margin * 2);
  const maxHeight = Math.min(420, viewport.height - margin * 2);
  const left = clampNumber(rect.left + viewport.offsetLeft, viewport.offsetLeft + margin, viewport.offsetLeft + viewport.width - width - margin);
  const belowTop = rect.bottom + viewport.offsetTop + gap;
  const aboveTop = rect.top + viewport.offsetTop - maxHeight - gap;
  const belowSpace = viewport.offsetTop + viewport.height - rect.bottom - margin;
  const top = belowSpace >= 260 || aboveTop < viewport.offsetTop + margin
    ? Math.min(belowTop, viewport.offsetTop + viewport.height - maxHeight - margin)
    : Math.max(viewport.offsetTop + margin, aboveTop);

  return { isSheet: false, style: { left: `${left}px`, top: `${top}px`, width: `${width}px`, maxHeight: `${maxHeight}px` } };
}

function useWheelPopover(open: boolean, triggerRef: RefObject<HTMLElement>, preferredWidth: number, matchTriggerWidth: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<PopoverPlacement>({ isSheet: false, style: {} });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function update() { if (triggerRef.current) setPlacement(getPopoverPlacement(triggerRef.current, preferredWidth, matchTriggerWidth)); }
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
  }, [matchTriggerWidth, open, preferredWidth, triggerRef]);

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

function WheelPopover({ open, triggerRef, preferredWidth, matchTriggerWidth = true, label, className, onClose, children }: {
  open: boolean;
  triggerRef: RefObject<HTMLElement>;
  preferredWidth: number;
  matchTriggerWidth?: boolean;
  label: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { panelRef, placement } = useWheelPopover(open, triggerRef, preferredWidth, matchTriggerWidth, onClose);
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

function pickerProps() {
  return {
    visibleCount: WHEEL_VISIBLE_COUNT,
    optionItemHeight: WHEEL_ITEM_HEIGHT,
    dragSensitivity: WHEEL_DRAG_SENSITIVITY,
    scrollSensitivity: WHEEL_SCROLL_SENSITIVITY
  };
}

type WheelDragState = {
  pointerId: number;
  startY: number;
  startIndex: number;
  lastIndex: number;
  clickIndex: number | null;
  moved: boolean;
  samples: Array<{ y: number; time: number }>;
};

function AppWheelPicker<T extends WheelPickerValue>({ options, value, onValueChange, infinite = false }: {
  options: WheelPickerOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  infinite?: boolean;
}) {
  const wheelProps = useMemo(() => pickerProps(), []);
  const dragRef = useRef<WheelDragState | null>(null);
  const animationRef = useRef<number | null>(null);
  const animationClassTimerRef = useRef<number | null>(null);
  const wheelAccumulatorRef = useRef(0);
  const wheelSpeedRef = useRef(0);
  const wheelLastTimeRef = useRef(0);
  const wheelResetTimerRef = useRef<number | null>(null);
  const activeIndexRef = useRef(0);
  const [animated, setAnimated] = useState(false);

  const currentIndex = options.findIndex((option) => option.value === value);
  const safeIndex = currentIndex >= 0 ? currentIndex : Math.max(0, options.findIndex((option) => !option.disabled));

  useEffect(() => {
    activeIndexRef.current = safeIndex;
  }, [safeIndex]);

  useEffect(() => () => {
    if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    if (animationClassTimerRef.current) window.clearTimeout(animationClassTimerRef.current);
    if (wheelResetTimerRef.current) window.clearTimeout(wheelResetTimerRef.current);
  }, []);

  function enableAnimation(duration = 180) {
    setAnimated(true);
    if (animationClassTimerRef.current) window.clearTimeout(animationClassTimerRef.current);
    animationClassTimerRef.current = window.setTimeout(() => {
      setAnimated(false);
      animationClassTimerRef.current = null;
    }, duration);
  }

  function normalizeIndex(index: number) {
    if (!options.length) return 0;
    const rounded = Math.round(index);
    return infinite ? ((rounded % options.length) + options.length) % options.length : clampNumber(rounded, 0, options.length - 1);
  }

  function enabledIndex(index: number, direction: number) {
    if (!options.length) return 0;
    const normalized = normalizeIndex(Math.round(index));
    if (!options[normalized]?.disabled) return normalized;
    const activeIndex = normalizeIndex(activeIndexRef.current);
    if (!options[activeIndex]?.disabled) return activeIndex;

    const step = direction || 1;
    for (let offset = 1; offset <= options.length; offset += 1) {
      const candidate = infinite ? normalizeIndex(normalized + offset * step) : normalized + offset * step;
      if (!infinite && (candidate < 0 || candidate >= options.length)) break;
      if (!options[candidate]?.disabled) return candidate;
    }
    for (let offset = 1; offset <= options.length; offset += 1) {
      const candidate = infinite ? normalizeIndex(normalized - offset * step) : normalized - offset * step;
      if (!infinite && (candidate < 0 || candidate >= options.length)) break;
      if (!options[candidate]?.disabled) return candidate;
    }
    return normalized;
  }

  function chooseIndex(index: number, direction = 1) {
    const nextIndex = enabledIndex(index, direction);
    const next = options[nextIndex];
    if (!next || next.disabled) return;
    activeIndexRef.current = nextIndex;
    onValueChange(next.value);
  }

  function shortestDelta(from: number, to: number) {
    if (!infinite || !options.length) return to - from;
    const direct = to - from;
    const forward = direct + options.length;
    const backward = direct - options.length;
    return [direct, forward, backward].reduce((best, next) => Math.abs(next) < Math.abs(best) ? next : best);
  }

  function animateToIndex(index: number, direction: number) {
    if (!options.length) return;
    if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    enableAnimation();

    const start = activeIndexRef.current;
    const end = enabledIndex(index, direction);
    const distance = shortestDelta(start, end);
    if (distance === 0) {
      chooseIndex(end, direction);
      return;
    }

    const duration = clampNumber(120 + Math.abs(distance) * 45, 140, 520);
    const startedAt = performance.now();
    let lastStep = 0;

    const tick = (time: number) => {
      const progress = clampNumber((time - startedAt) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const step = Math.round(distance * eased);
      if (step !== lastStep) {
        chooseIndex(start + step, Math.sign(step - lastStep) || direction);
        lastStep = step;
      }
      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(tick);
        return;
      }
      animationRef.current = null;
      chooseIndex(start + distance, direction);
    };

    animationRef.current = window.requestAnimationFrame(tick);
  }

  function indexFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const optionItem = (event.target as HTMLElement).closest("[data-rwp-option]") as HTMLElement | null;
    const optionIndex = optionItem?.dataset.index ? Number(optionItem.dataset.index) : Number.NaN;
    if (Number.isFinite(optionIndex)) return normalizeIndex(optionIndex);

    const picker = event.currentTarget.querySelector<HTMLElement>("[data-rwp]");
    const rect = picker?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    const offset = Math.round((event.clientY - (rect.top + rect.height / 2)) / WHEEL_ITEM_HEIGHT);
    return activeIndexRef.current + offset;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !options.length) return;
    event.preventDefault();
    event.stopPropagation();
    if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    enableAnimation(240);
    event.currentTarget.setPointerCapture(event.pointerId);
    const now = performance.now();
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startIndex: activeIndexRef.current,
      lastIndex: activeIndexRef.current,
      clickIndex: indexFromPointer(event),
      moved: false,
      samples: [{ y: event.clientY, time: now }]
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const delta = ((drag.startY - event.clientY) / WHEEL_ITEM_HEIGHT) * Math.max(1, WHEEL_DRAG_SENSITIVITY / 3);
    const nextFloatIndex = drag.startIndex + delta;
    const nextIndex = Math.round(nextFloatIndex);
    const direction = Math.sign(nextIndex - drag.lastIndex) || Math.sign(delta) || 1;

    if (Math.abs(event.clientY - drag.startY) > 4) drag.moved = true;
    if (nextIndex !== drag.lastIndex) {
      enableAnimation(180);
      chooseIndex(nextIndex, direction);
      drag.lastIndex = nextIndex;
    }

    drag.samples.push({ y: event.clientY, time: performance.now() });
    if (drag.samples.length > 5) drag.samples.shift();
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (cancelled) return;
    if (!drag.moved) {
      const target = drag.clickIndex ?? indexFromPointer(event);
      animateToIndex(target, Math.sign(target - activeIndexRef.current) || 1);
      return;
    }

    const samples = drag.samples;
    const first = samples[Math.max(0, samples.length - 3)];
    const last = samples[samples.length - 1];
    const elapsed = Math.max(16, last.time - first.time);
    const velocity = ((first.y - last.y) / WHEEL_ITEM_HEIGHT) * (1000 / elapsed);
    const projected = drag.lastIndex + velocity * 0.18;
    animateToIndex(projected, Math.sign(velocity) || Math.sign(drag.lastIndex - drag.startIndex) || 1);
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!options.length) return;
    event.preventDefault();
    event.stopPropagation();

    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 240 : 1;
    const normalizedDelta = event.deltaY * unit;
    const now = performance.now();
    const elapsed = now - wheelLastTimeRef.current;
    wheelLastTimeRef.current = now;
    wheelSpeedRef.current = elapsed < 90
      ? Math.min(360, wheelSpeedRef.current * 0.62 + Math.abs(normalizedDelta))
      : Math.abs(normalizedDelta);
    wheelAccumulatorRef.current += normalizedDelta;

    const threshold = 72;
    const rawSteps = wheelAccumulatorRef.current > 0
      ? Math.floor(wheelAccumulatorRef.current / threshold)
      : Math.ceil(wheelAccumulatorRef.current / threshold);
    const acceleration = wheelSpeedRef.current > 240 ? 3 : wheelSpeedRef.current > 145 ? 2 : 1;
    const steps = clampNumber(rawSteps * acceleration, -4, 4);

    if (steps !== 0) {
      wheelAccumulatorRef.current -= rawSteps * threshold;
      animateToIndex(activeIndexRef.current + steps, Math.sign(steps) || 1);
      enableAnimation(260);
    }

    if (wheelResetTimerRef.current) window.clearTimeout(wheelResetTimerRef.current);
    wheelResetTimerRef.current = window.setTimeout(() => {
      wheelAccumulatorRef.current = 0;
      wheelSpeedRef.current = 0;
      wheelResetTimerRef.current = null;
    }, 160);
  }

  return (
    <div
      className={`app-wheel-picker ${animated ? "is-animated" : ""}`}
      onPointerCancel={(event) => finishPointer(event, true)}
      onPointerDownCapture={handlePointerDown}
      onPointerMoveCapture={handlePointerMove}
      onPointerUpCapture={(event) => finishPointer(event)}
      onWheelCapture={handleWheel}
    >
      <WheelPicker
        {...wheelProps}
        options={options}
        value={value}
        onValueChange={(nextValue) => {
          const nextIndex = options.findIndex((option) => option.value === nextValue);
          if (nextIndex >= 0) chooseIndex(nextIndex, Math.sign(nextIndex - activeIndexRef.current) || 1);
        }}
        infinite={infinite}
      />
    </div>
  );
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function todayParts(): DateParts {
  const [year, month, day] = todayISO().split("-").map(Number);
  return { year, month, day };
}

function compareDateParts(left: DateParts, right: DateParts) {
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  return left.day - right.day;
}

function normalizeDateParts(parts: DateParts, minDate = todayParts()): DateParts {
  const year = Math.max(parts.year, minDate.year);
  const monthMin = year === minDate.year ? minDate.month : 1;
  const month = clampNumber(parts.month, monthMin, 12);
  const calendarDayMax = daysInMonth(year, month);
  const dayMin = year === minDate.year && month === minDate.month ? minDate.day : 1;
  const day = clampNumber(parts.day, dayMin, calendarDayMax);
  return { year, month, day };
}

function datePartsToISO(parts: DateParts) {
  const next = normalizeDateParts(parts);
  return `${next.year}-${pad(next.month)}-${pad(next.day)}`;
}

function parseDate(value?: string | null): DateParts {
  const fallback = todayISO();
  const raw = value || fallback;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return parseDate(fallback);
  return normalizeDateParts({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) });
}

function parseManualDate(value: string): DateParts | null {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return normalizeDateParts({ year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) });
  const dotted = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotted) return normalizeDateParts({ year: Number(dotted[3]), month: Number(dotted[2]), day: Number(dotted[1]) });
  return null;
}

function formatManualDate(parts: DateParts) {
  const next = normalizeDateParts(parts);
  return `${pad(next.day)}.${pad(next.month)}.${next.year}`;
}

function dateIsBeforeMin(parts: DateParts, minDate: DateParts) {
  return compareDateParts(parts, minDate) < 0;
}

function monthOptions(year: number, minDate: DateParts): WheelPickerOption<number>[] {
  return MONTH_OPTIONS.map((option) => ({
    ...option,
    disabled: year < minDate.year || (year === minDate.year && option.value < minDate.month)
  }));
}

function dayOptions(year: number, month: number, minDate: DateParts): WheelPickerOption<number>[] {
  return Array.from({ length: daysInMonth(year, month) }, (_, index) => {
    const value = index + 1;
    return {
      value,
      label: pad(value),
      disabled: dateIsBeforeMin({ year, month, day: value }, minDate)
    };
  });
}

function yearOptions(selectedYear: number, minDate: DateParts) {
  const start = Math.min(1970, minDate.year - 8);
  const end = Math.max(minDate.year + 12, selectedYear + 12);
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const value = start + index;
    return { value, label: String(value), disabled: value < minDate.year };
  });
}

function durationParts(value: number, min: number, max: number) {
  const safe = clampNumber(Math.round(value || min), min, max);
  return { hour: Math.floor(safe / 60), minute: safe % 60 };
}

function durationToMinutes(hour: number, minute: number, min: number, max: number) {
  return clampNumber(hour * 60 + minute, min, max);
}

function formatDuration(value: number) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  if (hour > 0 && minute > 0) return `${hour} ч ${minute} мин`;
  if (hour > 0) return `${hour} ч`;
  return `${minute} мин`;
}

function parseManualDuration(value: string) {
  const trimmed = value.trim();
  const clock = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const minutes = trimmed.match(/^(\d+)$/);
  if (minutes) return Number(minutes[1]);
  return null;
}

function formatManualDuration(value: number) {
  const parts = durationParts(value, 1, 24 * 60);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

function parseManualTime(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 4);
  if (numbers.length <= 2) return numbers;
  return `${numbers.slice(0, 2)}:${numbers.slice(2)}`;
}

// Central wheel inputs for time, date, and focus duration.
// The picker API mirrors the reusable wheel-picker anatomy used across the app.
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
  const hours = useMemo<WheelPickerOption<number>[]>(() => Array.from({ length: 24 }, (_, index) => ({ value: index, label: pad(index) })), []);
  const minutes = useMemo<WheelPickerOption<number>[]>(() => Array.from({ length: 60 }, (_, index) => ({ value: index, label: pad(index) })), []);

  useEffect(() => { if (open) setDraft(parseTime(value)); }, [open, value]);

  function updateDraftFromTimeInput(nextValue: string) { setDraft(parseTime(nextValue)); }
  function apply() { onChange(`${pad(draft.hour)}:${pad(draft.minute)}`); setOpen(false); }
  function clear() { onChange(null); setOpen(false); }
  const manualTimeValue = `${pad(draft.hour)}:${pad(draft.minute)}`;

  return (
    <div className="wheel-field">
      <button ref={triggerRef} type="button" className={`input wheel-trigger ${value ? "filled" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={() => setOpen((state) => !state)}>
        {value ? formatTime(value) : placeholder}
      </button>
      <WheelPopover open={open} triggerRef={triggerRef} preferredWidth={244} label={label} className="wheel-panel--picker time-wheel" onClose={() => setOpen(false)}>
        <div className="wheel-panel-head wheel-panel-head--manual">
          <label className="wheel-manual-label">
            <span>Вручную</span>
            <input className="input wheel-manual-input wheel-manual-time-input" type="text" inputMode="numeric" value={manualTimeValue} aria-label="Ввести время вручную" onChange={(event) => updateDraftFromTimeInput(parseManualTime(event.target.value))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); apply(); } }} />
          </label>
        </div>
        <WheelPickerWrapper className="wheel-picker-wrapper time-wheel-picker">
          <AppWheelPicker options={hours} value={draft.hour} onValueChange={(hour) => setDraft((state) => ({ ...state, hour }))} infinite />
          <span className="time-wheel-divider" aria-hidden="true">:</span>
          <AppWheelPicker options={minutes} value={draft.minute} onValueChange={(minute) => setDraft((state) => ({ ...state, minute }))} infinite />
        </WheelPickerWrapper>
        <div className="wheel-actions">{allowClear ? <button type="button" className="btn btn-ghost" onClick={clear}>Очистить</button> : null}<button type="button" className="btn btn-primary" onClick={apply}>Применить</button></div>
      </WheelPopover>
    </div>
  );
}

export function DurationWheelInput({ value, onChange, min = 1, max = 180, label = "выбрать длительность", placeholder = "30 мин" }: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  placeholder?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => durationParts(value, min, max));
  const [manualValue, setManualValue] = useState(() => formatManualDuration(clampNumber(value, min, max)));
  const maxHour = Math.ceil(max / 60);
  const hours = useMemo<WheelPickerOption<number>[]>(() => Array.from({ length: maxHour + 1 }, (_, index) => ({ value: index, label: pad(index) })), [maxHour]);
  const minutes = useMemo<WheelPickerOption<number>[]>(() => Array.from({ length: 60 }, (_, index) => ({ value: index, label: pad(index) })), []);
  const currentValue = durationToMinutes(draft.hour, draft.minute, min, max);

  useEffect(() => {
    if (!open) return;
    const parts = durationParts(value, min, max);
    setDraft(parts);
    setManualValue(formatManualDuration(durationToMinutes(parts.hour, parts.minute, min, max)));
  }, [open, value, min, max]);

  function updateDraft(hour: number, minute: number) {
    const nextValue = durationToMinutes(hour, minute, min, max);
    const nextParts = durationParts(nextValue, min, max);
    setDraft(nextParts);
    setManualValue(formatManualDuration(nextValue));
  }

  function resolveManualValue() {
    const parsed = parseManualDuration(manualValue);
    const nextValue = parsed === null ? currentValue : clampNumber(parsed, min, max);
    const nextParts = durationParts(nextValue, min, max);
    setDraft(nextParts);
    setManualValue(formatManualDuration(nextValue));
    return durationToMinutes(nextParts.hour, nextParts.minute, min, max);
  }

  function apply(nextValue = resolveManualValue()) { onChange(nextValue); setOpen(false); }

  return (
    <div className="wheel-field">
      <button ref={triggerRef} type="button" className={`input wheel-trigger ${value ? "filled" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={() => setOpen((state) => !state)}>
        {value ? formatDuration(value) : placeholder}
      </button>
      <WheelPopover open={open} triggerRef={triggerRef} preferredWidth={244} label={label} className="wheel-panel--picker duration-wheel" onClose={() => setOpen(false)}>
        <div className="wheel-panel-head wheel-panel-head--manual">
          <label className="wheel-manual-label">
            <span>Вручную</span>
            <input className="input wheel-manual-input" type="text" inputMode="numeric" value={manualValue} aria-label="Ввести длительность вручную" onChange={(event) => setManualValue(event.target.value.replace(/[^\d:]/g, ""))} onBlur={resolveManualValue} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); apply(); } }} />
          </label>
        </div>
        <WheelPickerWrapper className="wheel-picker-wrapper duration-wheel-picker">
          <AppWheelPicker options={hours} value={draft.hour} onValueChange={(hour) => updateDraft(hour, draft.minute)} />
          <span className="time-wheel-divider" aria-hidden="true">:</span>
          <AppWheelPicker options={minutes} value={draft.minute} onValueChange={(minute) => updateDraft(draft.hour, minute)} infinite />
        </WheelPickerWrapper>
        <div className="wheel-actions single-action"><button type="button" className="btn btn-primary" onClick={() => apply()}>Применить</button></div>
      </WheelPopover>
    </div>
  );
}

export function QuestPlanWheelInput({ days, steps, onChange, min = 1, max = 365, label = "выбрать длительность и шаги" }: {
  days: number;
  steps: number;
  onChange: (value: { days: number; steps: number }) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => ({
    days: clampNumber(Math.round(days || min), min, max),
    steps: clampNumber(Math.round(steps || min), min, max)
  }));
  const options = useMemo<WheelPickerOption<number>[]>(
    () => Array.from({ length: max - min + 1 }, (_, index) => {
      const value = min + index;
      return { value, label: String(value) };
    }),
    [max, min]
  );

  useEffect(() => {
    if (!open) return;
    setDraft({
      days: clampNumber(Math.round(days || min), min, max),
      steps: clampNumber(Math.round(steps || min), min, max)
    });
  }, [days, max, min, open, steps]);

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <div className="wheel-field">
      <button ref={triggerRef} type="button" className="input wheel-trigger filled" aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={() => setOpen((state) => !state)}>
        {`${days} дн. / ${steps} ${steps === 1 ? "шаг" : "шагов"}`}
      </button>
      <WheelPopover open={open} triggerRef={triggerRef} preferredWidth={244} label={label} className="wheel-panel--picker quest-plan-wheel" onClose={() => setOpen(false)}>
        <div className="quest-plan-wheel-labels" aria-hidden="true">
          <span>дни</span>
          <span>шаги</span>
        </div>
        <WheelPickerWrapper className="wheel-picker-wrapper quest-plan-wheel-picker">
          <div className="quest-plan-wheel-column">
            <AppWheelPicker options={options} value={draft.days} onValueChange={(nextDays) => setDraft((state) => ({ ...state, days: nextDays }))} infinite />
          </div>
          <div className="quest-plan-wheel-column">
            <AppWheelPicker options={options} value={draft.steps} onValueChange={(nextSteps) => setDraft((state) => ({ ...state, steps: nextSteps }))} infinite />
          </div>
        </WheelPickerWrapper>
        <div className="wheel-actions single-action"><button type="button" className="btn btn-primary" onClick={apply}>Применить</button></div>
      </WheelPopover>
    </div>
  );
}

export function DateWheelInput({ value, onChange, placeholder = "Выбрать дату", label = "выбрать дату" }: {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseDate(value));
  const [manualValue, setManualValue] = useState(() => formatManualDate(parseDate(value)));
  const minDate = todayParts();
  const days = useMemo<WheelPickerOption<number>[]>(() => dayOptions(draft.year, draft.month, minDate), [draft.day, draft.month, draft.year, minDate.day, minDate.month, minDate.year]);
  const months = useMemo<WheelPickerOption<number>[]>(() => monthOptions(draft.year, minDate), [draft.year, minDate.month, minDate.year]);
  const years = useMemo<WheelPickerOption<number>[]>(() => yearOptions(draft.year, minDate), [draft.year, minDate.year]);
  const displayValue = value ? formatDate(datePartsToISO(parseDate(value))) : placeholder;

  useEffect(() => {
    if (!open) return;
    const parts = parseDate(value);
    setDraft(parts);
    setManualValue(formatManualDate(parts));
  }, [open, value]);

  function updateDraft(next: DateParts) {
    const normalized = normalizeDateParts(next, minDate);
    setDraft(normalized);
    setManualValue(formatManualDate(normalized));
  }

  function resolveManualValue() {
    const parsed = parseManualDate(manualValue);
    const next = parsed ?? draft;
    updateDraft(next);
    return datePartsToISO(next);
  }

  function apply(nextValue = resolveManualValue()) { onChange(nextValue); setOpen(false); }

  return (
    <div className="wheel-field">
      <button ref={triggerRef} type="button" className={`input wheel-trigger ${value ? "filled" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={() => setOpen((state) => !state)}>
        {displayValue}
      </button>
      <WheelPopover open={open} triggerRef={triggerRef} preferredWidth={300} label={label} className="wheel-panel--picker date-wheel" onClose={() => setOpen(false)}>
        <div className="wheel-panel-head wheel-panel-head--manual">
          <label className="wheel-manual-label">
            <span>Вручную</span>
            <input className="input wheel-manual-input wheel-manual-date-input" type="text" inputMode="numeric" value={manualValue} aria-label="Ввести дату вручную" onChange={(event) => {
              const nextValue = event.target.value.replace(/[^\d.-]/g, "");
              setManualValue(nextValue);
              const parsed = parseManualDate(nextValue);
              if (parsed) setDraft(parsed);
            }} onBlur={resolveManualValue} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); apply(); } }} />
          </label>
        </div>
        <WheelPickerWrapper className="wheel-picker-wrapper date-wheel-picker">
          <AppWheelPicker options={days} value={draft.day} onValueChange={(day) => updateDraft({ ...draft, day })} />
          <AppWheelPicker options={months} value={draft.month} onValueChange={(month) => updateDraft({ ...draft, month })} />
          <AppWheelPicker options={years} value={draft.year} onValueChange={(year) => updateDraft({ ...draft, year })} />
        </WheelPickerWrapper>
        <div className="wheel-actions single-action"><button type="button" className="btn btn-primary" onClick={() => apply()}>Применить</button></div>
      </WheelPopover>
    </div>
  );
}
