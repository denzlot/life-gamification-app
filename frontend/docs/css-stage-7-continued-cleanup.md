# CSS stage 7 continued cleanup

This pass continues the safe Stage 7 plan after the previous visual check.

## Removed

- Removed the old self-contained focus timer component.
- Removed `src/styles/focus-timer.css`.
- Removed focus timer imports/usages from the Today start panel and sidebar.

The task-focus button that highlights the next unfinished item remains; it is not the timer and still belongs to the daily-plan workflow.

## Migrated from legacy.css

- `src/styles/avatar.css`: avatar frame, Game HUD, HP/XP meter styling and character chooser rules.
- `src/styles/toasts.css`: toast stack and toast tone styles.
- `src/styles/theme.css`: theme switcher rules.
- `src/styles/brand.css`: inline brand mark SVG styling.
- shared meter primitives were appended to `src/styles/components.css`.

## Guardrails

- No mass `!important` removal.
- No emptying `legacy.css`.
- No JSX/business logic changes beyond deleting the unwanted timer UI.
- Migrated rules keep their original declarations, including existing `!important` where present.

## Verify manually

- Today page start panel and sidebar no longer show the timer.
- Avatar and HUD still render correctly on Today/Profile.
- Character chooser still looks correct during registration/profile flows.
- Toasts still appear in the bottom-right corner.
- Theme switcher still works on desktop and mobile.
