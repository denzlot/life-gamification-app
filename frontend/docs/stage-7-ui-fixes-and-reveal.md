# Stage 7 UI fixes and optional reveal polish

This pass stays on the safe Stage 7 path: no mass `!important` removal, no cascade-layer rewrite, and no broad layout reset.

## Fixed

- DayDetails task creation now mirrors the Today task modal more closely: the fixed date is a full-width field row instead of a right-side chip.
- DayDetails day plan section now uses the same flex/footer behavior as Today, so note actions sit in a predictable footer area.
- Optional form sections opened by chips use a short reveal animation instead of snapping into place.

## Added

- `src/components/RevealSection.tsx` for optional fields that appear below chip toolbars.
- `fv-option-reveal-in` animation in `motion.css`.
- shared `.option-reveal*` CSS in `components.css`.

## Not changed

- No business logic or API payloads.
- No bulk `!important` removal.
- Calendar loading/empty messages remain removed from the user-facing flow; real API errors are still shown.
