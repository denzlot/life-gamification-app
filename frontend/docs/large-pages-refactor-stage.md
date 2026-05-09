# Large pages refactor stage

This pass continues the frontend cleanup from the latest calendar-stage archive.

## Scope

- QuestsPage was reduced by moving quest form, list, route view, step list, and step editor UI into `src/components/quests/`.
- DayDetailsPage was reduced by moving hero, task-create modal, daily plan list, plan item, and note editor UI into `src/components/dayDetails/`.
- Shared daily-plan item utilities moved into `src/utils/dailyPlanItems.ts` so TodayPage and DayDetailsPage stop duplicating sorting, grouping, status counting, and cycle labels.

## Intentional non-goals

- No API contracts changed.
- No backend behavior changed.
- No CSS migration in this pass. The current import order keeps legacy CSS last, so moving large page CSS without changing cascade order would be risky.
- TodayPage still has inline toolbar/modal/list markup and should be the next code cleanup target.

## Verification

Run:

```bash
npm ci
npm run audit:css
npm run typecheck
npm run build
```

The build passed after this stage.
