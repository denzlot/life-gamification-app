# Component stage 5.2.2: OptionChip

This step removes the duplicated local `OptionButton` helpers from the task, habit, quest, and day details pages.

## Changed

- Added `src/components/OptionChip.tsx`.
- Replaced local `OptionButton` declarations with the shared `OptionChip` component in:
  - `src/pages/TodayPage.tsx`
  - `src/pages/QuestsPage.tsx`
  - `src/pages/HabitsPage.tsx`
  - `src/pages/DayDetailsPage.tsx`

## Behavior

The shared component preserves the existing markup contract:

- root element: `<button type="button">`
- base class: `option-chip`
- active class: `active`

It also adds `aria-pressed` so screen readers understand the chip as a toggle-like control.

## Notes

No CSS was moved in this step. The existing `option-chip` styles still live in `src/styles/legacy.css` and should be extracted later together with optional form toolbar styles.
