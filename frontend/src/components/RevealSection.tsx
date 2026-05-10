import type { ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

interface RevealSectionProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

/** Smoothly reveals optional form controls (height + fade) without changing the form state contract. */
export function RevealSection({ open, children, className }: RevealSectionProps) {
  return (
    <div className={cx("option-reveal", open && "is-open", className)} aria-hidden={!open}>
      <div className="option-reveal-inner">{children}</div>
    </div>
  );
}
