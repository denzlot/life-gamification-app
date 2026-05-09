# Component refactor stage 6

This stage combines the optional wheel-input cleanup with the first safe TodayPage split.

## What changed

- `src/components/FormFields.tsx` now owns only generic fields: `Field`, `TextInput`, `TextArea`, `SelectInput`.
- `src/components/WheelInputs.tsx` owns `DateWheelInput`, `TimeWheelInput`, and `NumberWheelInput`.
- `FormFields.tsx` still re-exports wheel inputs, so existing page imports keep working.
- `src/components/StatusCycleIcon.tsx` extracts the daily-plan status icon from `TodayPage`.
- `src/components/today/TodayHero.tsx` extracts the date header and previous/next day links.
- `src/components/today/TodayPlanSummary.tsx` extracts the day progress header.

## Safety notes

- Existing CSS class names are preserved.
- Existing imports from `../components/FormFields` continue to work.
- No API calls or daily-plan business logic were changed.
- TodayPage still owns mutation logic, filtering, editing, grouping, notes, and create-task modal state.

## Checks

Run:

```bash
npm ci
npm run audit:css
npm run build
```

In the refactor environment, `npm run audit:css` and `npx vite build` passed. `tsc -b` still timed out in the container as it did before this stage, so run the full `npm run build` locally.
