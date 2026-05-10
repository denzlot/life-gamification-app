# Today / Daily Plan refactor stage

## Scope

This pass continues the large-page cleanup without changing API contracts or backend payloads.

## Changed structure

- `TodayPage` keeps page state, API calls, cache updates, optimistic updates, and achievement/profile side effects.
- Today-only markup moved into `src/components/today/*`:
  - `TodayToolbar`
  - `TodayTaskCreateModal`
  - `TodayNoteEditor`
  - `TodayStartPanel`
  - `TodaySidebar`
- Shared daily-plan list markup moved into `src/components/dailyPlan/*`:
  - `DailyPlanItemRow`
  - `DailyPlanGroups`
- `DayDetailsPage` now reuses the shared daily-plan list through its existing `DayPlanGroups` wrapper.

## Fixes made while extracting

- The description toggle now uses `aria-expanded` and switches its label between show/hide.
- Read-only daily-plan titles no longer attach a click handler.
- Day Details two-column toggle now actually splits grouped items into two columns through the shared list component.
- Today-specific CSS was moved from `legacy.css` into `src/styles/pages/today.css` and removed from legacy, instead of layering new rules on top.
- Style import order was adjusted so migrated page files load after `legacy.css` and can safely override old rules.

## Verification

Run:

```bash
npm ci
npm run audit:css
npm run typecheck
npm run build
```

The stage was verified with `npm run typecheck` and `npm run build`.
