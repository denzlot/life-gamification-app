# Stage 7 continuation: calendar/habits fixes and legacy cleanup

## User-facing fixes

- Removed calendar loading text from the calendar grid area so month changes do not display transient copy.
- Removed the temporary "selected quest has no steps" message from the calendar page. The calendar now stays visually stable while quest steps refresh.
- Removed the calendar sidebar step-loading label. Errors still render, but normal loading/selection does not flash text.
- Restored theme-aware weekday picker colors in Habits. The weekday buttons now use `var(--accent)` instead of hardcoded vampire/red values.
- Removed colored source separators for task/habit/quest daily-plan groups. Group separator lines now use the same theme border color as other lines.

## Cleanup continued

- Moved the remaining safe rules out of `legacy.css` into domain files.
- `legacy.css` now contains only placeholder comments so future cleanup has a clear boundary.
- Kept existing `!important` declarations. This stage did not repeat the unsafe global `!important` removal.

## Checks run

```bash
npm run audit:css
npm run typecheck -- --pretty false
npm run build
```

All checks passed.

## Manual checks to run

- Habits page: weekday picker in light/dark/rpg/vampire themes.
- Today and Day Details: daily-plan task/habit/quest group separators.
- Calendar page: month switching and quest selection should not show loading or empty-step text.
- Calendar page: errors still appear as overlay, without pushing the calendar grid.
