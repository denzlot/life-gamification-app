import type { ReactNode } from "react";

interface OptionChipProps {
  active?: boolean;
  children: ReactNode;
  className?: string;
  onClick: () => void;
}

/** Shared toggle chip used in compact optional form toolbars. */
export function OptionChip({ active = false, children, className = "", onClick }: OptionChipProps) {
  const classes = ["option-chip", active ? "active" : "", className].filter(Boolean).join(" ");

  return (
    <button type="button" className={classes} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}
