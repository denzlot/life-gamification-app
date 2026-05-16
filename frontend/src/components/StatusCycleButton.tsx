import { useRef, type ButtonHTMLAttributes, type MouseEvent, type PointerEvent } from "react";
import type { DailyPlanItemStatus } from "../api/types";
import { StatusCycleIcon } from "./StatusCycleIcon";

interface StatusCycleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick"> {
  status: DailyPlanItemStatus;
  onActivate: () => void;
}

export function StatusCycleButton({ status, className = "", disabled, onActivate, ...props }: StatusCycleButtonProps) {
  const pointerActivatedAt = useRef(0);

  function activateFromPointer(event: PointerEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerActivatedAt.current = Date.now();
    event.preventDefault();
    onActivate();
  }

  function activateFromClick(event: MouseEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.detail > 0 && Date.now() - pointerActivatedAt.current < 700) return;
    onActivate();
  }

  return (
    <button
      {...props}
      type="button"
      className={`status-cycle status-cycle-${status.toLowerCase()} ${className}`}
      disabled={disabled}
      onPointerDown={activateFromPointer}
      onClick={activateFromClick}
    >
      <StatusCycleIcon status={status} />
    </button>
  );
}
