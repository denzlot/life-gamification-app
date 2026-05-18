import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  children: ReactNode;
  eyebrow?: string;
  headerSlot?: ReactNode;
  title: string;
  open?: boolean;
  size?: ModalSize;
  className?: string;
  onClose: () => void;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Modal({ children, eyebrow, headerSlot, title, open = true, size = "md", className, onClose }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus({ preventScroll: true });
    };
  }, [mounted, open]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
      .filter((element) => element.offsetParent !== null || element === document.activeElement);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="flow-modal-backdrop" onMouseDown={onClose}>
      <div className="flow-modal-positioner">
        <div
          ref={dialogRef}
          className={cx("flow-modal", `flow-modal--${size}`, className)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="flow-modal-header">
            <div className="flow-modal-title">
              {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
              <h2 id={titleId} className="sr-only">{title}</h2>
            </div>
            {headerSlot ? <div className="flow-modal-header-slot">{headerSlot}</div> : <span className="flow-modal-header-slot" aria-hidden="true" />}
            <button type="button" className="flow-modal-close" onClick={onClose} aria-label="Закрыть">
              ×
            </button>
          </header>
          <div className="flow-modal-body">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
