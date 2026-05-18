import { useEffect, useState } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cx("field", "clean-field", className)}>
      <span>{label}</span>
      {children}
      {hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  // Keep the base input class even when callers pass a page-specific className.
  return <input className={cx("input", className)} {...rest} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, rows = 1, ...rest } = props;
  return <textarea className={cx("input", "textarea", className)} rows={rows} {...rest} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  // Selects need both classes: input gives shell styles, select keeps browser theme handling.
  return <select className={cx("input", "select", className)} {...rest} />;
}

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode" | "pattern" | "min" | "max"> & {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function NumberInput({ value, onChange, min = 0, max = 9999, suffix, className, onBlur, onKeyDown, ...rest }: NumberInputProps) {
  const [draft, setDraft] = useState(() => String(clampNumber(Math.round(value || min), min, max)));

  useEffect(() => {
    setDraft(String(clampNumber(Math.round(value || min), min, max)));
  }, [max, min, value]);

  function commit(raw = draft) {
    const parsed = Number.parseInt(raw, 10);
    const next = clampNumber(Number.isFinite(parsed) ? parsed : min, min, max);
    setDraft(String(next));
    onChange(next);
  }

  return (
    <div className={cx("number-input-shell", suffix && "has-suffix", className)}>
      <input
        className="input number-text-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={(event) => {
          const nextDraft = event.target.value.replace(/\D/g, "");
          setDraft(nextDraft);
          if (nextDraft !== "") onChange(clampNumber(Number.parseInt(nextDraft, 10), min, max));
        }}
        onBlur={(event) => {
          commit(event.currentTarget.value);
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!event.defaultPrevented && event.key === "Enter") {
            event.preventDefault();
            commit(event.currentTarget.value);
            event.currentTarget.blur();
          }
        }}
        {...rest}
      />
      {suffix ? <span className="number-input-suffix">{suffix}</span> : null}
    </div>
  );
}

export { DateWheelInput, DurationWheelInput, QuestPlanWheelInput, TimeWheelInput } from "./WheelInputs";
