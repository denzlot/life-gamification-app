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

// Preserve the old import path while keeping wheel-specific logic out of this generic fields file.
export { DateWheelInput, NumberWheelInput, TimeWheelInput } from "./WheelInputs";
