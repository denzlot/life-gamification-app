# CSS stage 7 multi-pass cleanup

This pass moved several CSS groups out of `src/styles/legacy.css` without changing frontend business logic.

## What moved

- Foundation rules into:
  - `src/styles/base.css`
  - `src/styles/layout.css`
  - `src/styles/navigation.css`
  - `src/styles/buttons.css`
  - `src/styles/forms.css`
- Shared daily-plan/list rules into:
  - `src/styles/components.css`
- Quest route/list/form styling into:
  - `src/styles/pages/quests.css`
- Calendar grid/sidebar/filter/workload styling into:
  - `src/styles/pages/calendar.css`

## Import order change

`legacy.css` now loads before migrated component and page styles:

1. base/layout/navigation/buttons/forms
2. legacy
3. components
4. page styles

That keeps migrated selectors authoritative and avoids adding another CSS layer above old code.

## Why `!important` was not aggressively deleted

Many `!important` declarations are still present, but they are now concentrated in smaller files. The next safe step is to remove them selector-by-selector with visual checks. Removing them all at once would be risky because some old selectors rely on specificity fights from the previous cascade.

## Verification

Passed:

```bash
npm run audit:css
npm run typecheck
npm run build
```

At this stage `legacy.css` is down to about 1308 lines. The remaining legacy rules are mostly cross-theme, avatar/HUD, modal/wheel, and mixed selectors that need separate review.
