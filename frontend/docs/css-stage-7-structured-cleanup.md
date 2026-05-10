# CSS Stage 7: structured cleanup continuation

This pass continues from the safe Stage 7 baseline. It avoids the previous unsafe approach of mass-removing `!important` and instead moves remaining legacy blocks into domain files while preserving their declarations.

## Removed from focus-timer cleanup baseline

The focus timer had already been removed in the previous safe step. This pass keeps that removal intact.

## New CSS domains

Added files:

- `src/styles/creation-panels.css` — shared create/open panels, drawer form spacing, fixed creation action layout.
- `src/styles/quest-picker.css` — quest picker backdrop, dialog, list and compact picker rules.
- `src/styles/date-navigation.css` — day/date switchers, center jump button and date navigation buttons.
- `src/styles/motion.css` — shared v21/v22 animation keyframes and interaction animations.
- `src/styles/headers.css` — compact shared page/header rules.
- `src/styles/overlays.css` — shared popover and overlay surfaces.
- `src/styles/control-states.css` — shared active states for chips/filter buttons.

Also moved domain rules into existing files:

- `theme.css` — light/dark/vampire shared theme overrides.
- `pages/quests.css` — quest route badges and quest calendar helper rules.
- `pages/calendar.css` — calendar route picker controls and combined route panel surfaces.
- `components.css` — fixed date chip.

## What stayed in `legacy.css`

The remaining `legacy.css` is intentionally smaller but not empty. It still contains old mixed rules that touch several domains at once, especially global form/list/layout repairs. These should be moved later only after visual checks.

## Guardrails kept

- No mass removal of `!important`.
- No cascade layers introduced.
- No JSX/business logic changes.
- No API changes.
- Every migrated rule keeps the original selector and declaration content.

## Verification

Run:

```bash
npm run audit:css
npm run typecheck
npm run build
```

Manually check:

- Today create/open panels
- DayDetails create panel and date navigation
- Quest picker dialog/list
- Calendar route popovers and route sidebar
- Theme switcher in light/dark/vampire/RPG
- Mobile layout around 390px and 720px
