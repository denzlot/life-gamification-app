# Calendar / Quests fixes and safe Stage 7 continuation

## Fixed UI regressions

### Calendar status text no longer shifts the grid
`CalendarPage` now renders transient statuses inside `.calendar-status-layer`, an absolutely positioned overlay inside the calendar panel.

This covers:
- month loading state;
- calendar loading errors;
- the selected quest empty-steps message.

The calendar grid remains in the normal document flow, so short-lived text does not push the grid down during month or display-mode changes.

### Quests archive button alignment
`QuestListPanel` now uses the same `section-title-row` pattern as the steps panel. The archive toggle is placed in the right side of the panel header, matching the level and alignment of the `Маршрут` / `Список шагов` button in the steps panel.

The old `.archive-toggle-row` CSS was removed because the row no longer exists.

## Continued Stage 7 cleanup

Moved additional safe rules out of `legacy.css`:
- DayDetails page-specific rules -> `src/styles/pages/day-details.css`
- Habits weekday/status rules -> `src/styles/pages/habits.css`
- Stats metric rows -> `src/styles/pages/stats.css`
- History action tones -> `src/styles/pages/history.css`
- Shared compact mini-list rows -> `src/styles/components.css`
- Shared loader pulse keyframe -> `src/styles/motion.css`

No mass removal of `!important` was done.

## Verification commands

```bash
npm ci
npm run audit:css
npm run typecheck
npm run build
```

## Manual checks

- Calendar: switch months repeatedly and confirm the grid does not move vertically when `Загрузка` appears.
- Calendar: select a quest with no steps and confirm the empty message overlays without pushing the grid.
- Quests: confirm `Архив` / `Показать активные` sits at the top-right of the left panel header, aligned like `Маршрут` on the right panel.
- Habits: verify weekday picker in create/edit form.
- DayDetails: verify date navigation and list layout.
- Stats/History: verify compact rows and action colors.
