import type { RefObject } from "react";
import type { DailyPlanItemResponse, DailyPlanItemStatus, SourceType } from "../../api/types";
import { Button } from "../Button";
import { TextInput } from "../FormFields";

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface TodayToolbarProps {
  isClosed: boolean;
  taskDrawerOpen: boolean;
  filtersOpen: boolean;
  sortByTime: boolean;
  twoColumnLayout: boolean;
  nextFocusItem: DailyPlanItemResponse | null;
  sourceFilters: Array<FilterOption<SourceType | "ALL">>;
  statusFilters: Array<FilterOption<DailyPlanItemStatus | "ALL">>;
  sourceFilter: SourceType | "ALL";
  statusFilter: DailyPlanItemStatus | "ALL";
  search: string;
  hostRef: RefObject<HTMLDivElement>;
  setTaskDrawerOpen: (updater: (value: boolean) => boolean) => void;
  setFiltersOpen: (updater: (value: boolean) => boolean) => void;
  setSortByTime: (updater: (value: boolean) => boolean) => void;
  setSourceFilter: (value: SourceType | "ALL") => void;
  setStatusFilter: (value: DailyPlanItemStatus | "ALL") => void;
  setSearch: (value: string) => void;
  toggleTwoColumnLayout: () => void;
  focusNextTask: () => void;
}

/** Toolbar state stays in TodayPage; this component only owns the controls markup. */
export function TodayToolbar({
  isClosed,
  taskDrawerOpen,
  filtersOpen,
  sortByTime,
  twoColumnLayout,
  nextFocusItem,
  sourceFilters,
  statusFilters,
  sourceFilter,
  statusFilter,
  search,
  hostRef,
  setTaskDrawerOpen,
  setFiltersOpen,
  setSortByTime,
  setSourceFilter,
  setStatusFilter,
  setSearch,
  toggleTwoColumnLayout,
  focusNextTask
}: TodayToolbarProps) {
  return (
    <div className="today-inline-toolbar inline-overlay-host" ref={hostRef}>
      <div className="today-controls-row">
        {!isClosed ? (
          <Button type="button" onClick={() => setTaskDrawerOpen((value) => !value)} aria-expanded={taskDrawerOpen}>
            {taskDrawerOpen ? "Скрыть задачу" : "Добавить задачу"}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>{filtersOpen ? "Скрыть фильтры" : "Фильтры"}</Button>
        <Button type="button" variant="ghost" onClick={() => setSortByTime((value) => !value)}>{sortByTime ? "Обычный порядок" : "По времени"}</Button>
        <Button type="button" variant="ghost" className={twoColumnLayout ? "toolbar-active" : ""} onClick={toggleTwoColumnLayout}>{twoColumnLayout ? "В один ряд" : "В два ряда"}</Button>
        <Button type="button" variant="ghost" className="focus-task-button" onClick={focusNextTask} disabled={!nextFocusItem}>Фокус</Button>
      </div>

      {filtersOpen ? (
        <div className="filter-panel drawer-panel toolbar-popover toolbar-popover--filters">
          <div className="filter-row">
            {sourceFilters.map((filter) => (
              <button type="button" key={filter.value} className={sourceFilter === filter.value ? "active" : ""} onClick={() => setSourceFilter(filter.value)}>{filter.label}</button>
            ))}
          </div>
          <div className="filter-row muted-row">
            {statusFilters.map((filter) => (
              <button type="button" key={filter.value} className={statusFilter === filter.value ? "active" : ""} onClick={() => setStatusFilter(filter.value)}>{filter.label}</button>
            ))}
          </div>
          <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск" />
        </div>
      ) : null}
    </div>
  );
}
