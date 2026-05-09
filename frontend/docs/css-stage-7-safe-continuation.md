# CSS Stage 7 safe continuation

This stage continues the Stage 7 cleanup from the restored safe baseline.

## What changed

Moved self-contained CSS blocks out of `src/styles/legacy.css` without removing their `!important` guards:

- `src/styles/modals.css`
  - form modal portal layout
  - modal card/grid behavior
  - modal-specific wheel popover overrides
  - compact modal weekday picker overrides
  - modal/reduced-motion keyframes that were already part of the repair layer
- `src/styles/wheels.css`
  - generic wheel field/popover/column styles
  - compact wheel sizing
  - light theme wheel overrides
  - manual number wheel controls
  - focus timer SVG ring
  - timer preset buttons
  - timer action layout

`src/styles/index.ts` now imports those files after `legacy.css` and before `components.css`/page styles, preserving the previous cascade position of the extracted repair rules.

## What did not change

- No mass removal of `!important`.
- `legacy.css` was not emptied.
- No cascade layers were introduced.
- No JSX or business logic was changed.
- No API contracts were changed.

## Verification

Commands run successfully:

```bash
npm run audit:css
npm run typecheck
npm run build
```

## Manual checks recommended

Because this stage touches modal and wheel styles, verify:

- Today task creation modal
- Day details add task panel/modal
- Quest create/edit modal
- Time/date/number wheel inputs
- Habit weekday picker inside modal/form contexts
- Focus timer block

The key risk is visual only: wheel popover positioning and modal compact layouts.
