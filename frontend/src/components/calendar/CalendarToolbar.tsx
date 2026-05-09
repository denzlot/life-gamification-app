import type { RefObject } from "react";
import type { CalendarDisplayMode } from "../../utils/calendarSchedule";

interface CalendarToolbarProps {
  overlayRef: RefObject<HTMLDivElement>;
  open: boolean;
  displayMode: CalendarDisplayMode;
  onToggleOpen: () => void;
  onDisplayModeChange: (mode: CalendarDisplayMode) => void;
}

const displayModeOptions: Array<{ value: CalendarDisplayMode; label: string }> = [
  { value: "clean", label: "Чисто" },
  { value: "workload", label: "Нагрузка" },
  { value: "rewards", label: "Итог" },
  { value: "full", label: "Всё" }
];

export function CalendarToolbar({ overlayRef, open, displayMode, onToggleOpen, onDisplayModeChange }: CalendarToolbarProps) {
  return (
    <div className="calendar-toolbar-stack inline-overlay-host" ref={overlayRef}>
      <div className="calendar-left-tools filter-row" aria-label="Настройки календаря">
        <div className="calendar-filter-control inline-overlay-host">
          <button type="button" className={open ? "active" : ""} onClick={onToggleOpen}>
            Фильтры
          </button>
          {open ? (
            <div className="calendar-filter-popover calendar-inline-filter-panel filter-panel toolbar-popover toolbar-popover--filters" aria-label="Фильтры отображения">
              <div className="filter-row">
                {displayModeOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={displayMode === option.value ? "active" : ""}
                    onClick={() => onDisplayModeChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
