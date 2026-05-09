# CalendarPage refactor stage

## Scope

This stage splits `CalendarPage` into smaller components without changing API calls, routing, CSS class names, or calendar business logic.

## New files

- `src/components/calendar/CalendarHeader.tsx`
- `src/components/calendar/CalendarToolbar.tsx`
- `src/components/calendar/CalendarGrid.tsx`
- `src/components/calendar/CalendarQuestSidebar.tsx`
- `src/utils/calendarSchedule.ts`

## What moved out of `CalendarPage`

- Month navigation header.
- Display filter toolbar and popover.
- Calendar grid, day cells, reward/workload rendering.
- Quest route sidebar.
- Quest pace, planned date, day label, and step grouping helpers.

## What stayed in `CalendarPage`

- Page-level API loading.
- Selected quest state.
- Calendar month cursor state.
- Filter state.
- Derived data wiring between API responses and components.

## Notes

CSS was intentionally left untouched in this stage. Calendar styles are still fragile and heavily depend on old cascade order, so the safer move is to split JSX first and extract CSS later.
