import { useEffect, useMemo, useState } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { formatDate, formatTime, todayISO } from "../utils/format";

export function Field({ label, children }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field clean-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, rows = 1, ...rest } = props;
  return <textarea className={`input textarea ${className ?? ""}`.trim()} rows={rows} {...rest} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="input select" {...props} />;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function clampDay(year: number, month: number, day: number) {
  const last = new Date(year, month, 0).getDate();
  return Math.min(day, last);
}

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
    hour: Number.isFinite(hourRaw) ? hourRaw : 9,
    minute: Number.isFinite(minuteRaw) ? minuteRaw : 0
  };
}

export function TimeWheelInput({
  value,
  onChange,
  placeholder = "Выбрать время",
  allowClear = true,
  label = "выбрать время"
}: {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseTime(value));
  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, index) => index), []);

  useEffect(() => {
    if (open) setDraft(parseTime(value));
  }, [open, value]);

  function apply() {
    onChange(`${pad(draft.hour)}:${pad(draft.minute)}`);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setOpen(false);
  }

  return (
    <div className="wheel-field compact-wheel-field">
      <button type="button" className={`input wheel-trigger ${value ? "filled" : ""}`} onClick={() => setOpen((state) => !state)}>
        {value ? formatTime(value) : placeholder}
      </button>
      {open ? (
        <div className="wheel-popover time-wheel compact-wheel" role="dialog" aria-label={label}>
          <p className="eyebrow">{label}</p>
          <div className="wheel-preview"><span>{pad(draft.hour)}</span><b>:</b><span>{pad(draft.minute)}</span></div>
          <div className="wheel-columns two-columns">
            <div className="wheel-column" aria-label="Часы">
              {hours.map((hour) => (
                <button type="button" key={hour} className={draft.hour === hour ? "selected" : ""} onClick={() => setDraft({ ...draft, hour })}>
                  {pad(hour)}
                </button>
              ))}
            </div>
            <div className="wheel-column" aria-label="Минуты">
              {minutes.map((minute) => (
                <button type="button" key={minute} className={draft.minute === minute ? "selected" : ""} onClick={() => setDraft({ ...draft, minute })}>
                  {pad(minute)}
                </button>
              ))}
            </div>
          </div>
          <div className="wheel-actions">
            {allowClear ? <button type="button" className="btn btn-ghost" onClick={clear}>Очистить</button> : null}
            <button type="button" className="btn btn-primary" onClick={apply}>Применить</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DateWheelInput({
  value,
  onChange,
  placeholder = "Выбрать дату",
  allowClear = true,
  label = "выбрать дату"
}: {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  label?: string;
}) {
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseDate(value));
  const years = useMemo(() => Array.from({ length: 9 }, (_, index) => currentYear - 2 + index), [currentYear]);
  const months = useMemo(() => ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"], []);
  const days = useMemo(() => {
    const last = new Date(draft.year, draft.month, 0).getDate();
    return Array.from({ length: last }, (_, index) => index + 1);
  }, [draft.year, draft.month]);

  useEffect(() => {
    if (open) setDraft(parseDate(value));
  }, [open, value]);

  function setYear(year: number) {
    setDraft((state) => ({ ...state, year, day: clampDay(year, state.month, state.day) }));
  }

  function setMonth(month: number) {
    setDraft((state) => ({ ...state, month, day: clampDay(state.year, month, state.day) }));
  }

  function apply() {
    onChange(`${draft.year}-${pad(draft.month)}-${pad(draft.day)}`);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setOpen(false);
  }

  return (
    <div className="wheel-field compact-wheel-field">
      <button type="button" className={`input wheel-trigger ${value ? "filled" : ""}`} onClick={() => setOpen((state) => !state)}>
        {value ? formatDate(value) : placeholder}
      </button>
      {open ? (
        <div className="wheel-popover date-wheel compact-wheel" role="dialog" aria-label={label}>
          <p className="eyebrow">{label}</p>
          <div className="wheel-preview date-preview"><span>{pad(draft.day)}</span><span>{months[draft.month - 1]}</span><span>{draft.year}</span></div>
          <div className="wheel-columns three-columns">
            <div className="wheel-column" aria-label="День">
              {days.map((day) => (
                <button type="button" key={day} className={draft.day === day ? "selected" : ""} onClick={() => setDraft({ ...draft, day })}>
                  {pad(day)}
                </button>
              ))}
            </div>
            <div className="wheel-column" aria-label="Месяц">
              {months.map((monthName, index) => {
                const month = index + 1;
                return <button type="button" key={monthName} className={draft.month === month ? "selected" : ""} onClick={() => setMonth(month)}>{monthName}</button>;
              })}
            </div>
            <div className="wheel-column" aria-label="Год">
              {years.map((year) => (
                <button type="button" key={year} className={draft.year === year ? "selected" : ""} onClick={() => setYear(year)}>
                  {year}
                </button>
              ))}
            </div>
          </div>
          <div className="wheel-actions">
            {allowClear ? <button type="button" className="btn btn-ghost" onClick={clear}>Очистить</button> : null}
            <button type="button" className="btn btn-primary" onClick={apply}>Применить</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function NumberWheelInput({
  value,
  onChange,
  min = 1,
  max = 60,
  placeholder = "Выбрать число",
  label = "выбрать число",
  suffix = ""
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  label?: string;
  suffix?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || min);
  const values = useMemo(() => Array.from({ length: max - min + 1 }, (_, index) => min + index), [min, max]);

  useEffect(() => {
    if (open) setDraft(value || min);
  }, [open, value, min]);

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <div className="wheel-field compact-wheel-field number-wheel-field">
      <button type="button" className="input wheel-trigger filled" onClick={() => setOpen((state) => !state)}>
        {value ? `${value}${suffix ? ` ${suffix}` : ""}` : placeholder}
      </button>
      {open ? (
        <div className="wheel-popover number-wheel compact-wheel" role="dialog" aria-label={label}>
          <p className="eyebrow">{label}</p>
          <div className="wheel-preview"><span>{draft}</span>{suffix ? <small>{suffix}</small> : null}</div>
          <div className="wheel-columns one-column">
            <div className="wheel-column" aria-label={label}>
              {values.map((entry) => (
                <button type="button" key={entry} className={draft === entry ? "selected" : ""} onClick={() => setDraft(entry)}>
                  {entry}
                </button>
              ))}
            </div>
          </div>
          <div className="wheel-actions single-action">
            <button type="button" className="btn btn-primary" onClick={apply}>Применить</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
