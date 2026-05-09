import type { ReactNode } from "react";
import { RevealSection } from "./RevealSection";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

interface ModalTwinTimeRowProps {
  timeOpen: boolean;
  deadlineOpen: boolean;
  timeField: ReactNode;
  deadlineField: ReactNode;
}

/** One flex row for plan time + deadline so a solo field sits in the first column (no empty grid hole). Always mounted so the first open gets a real closed→open frame (CSS transitions run). */
export function ModalTwinTimeRow({ timeOpen, deadlineOpen, timeField, deadlineField }: ModalTwinTimeRowProps) {
  const bothClosed = !timeOpen && !deadlineOpen;
  const layout = timeOpen && deadlineOpen ? "pair" : timeOpen ? "time-only" : deadlineOpen ? "deadline-only" : null;
  return (
    <div className={cx("modal-twin-row", bothClosed && "modal-twin-row--empty", layout && `modal-twin-row--${layout}`)}>
      <RevealSection open={timeOpen}>{timeField}</RevealSection>
      <RevealSection open={deadlineOpen}>{deadlineField}</RevealSection>
    </div>
  );
}
