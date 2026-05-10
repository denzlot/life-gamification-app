# Component refactor stage 5.2.1

Scope: only `src/components/FormFields.tsx` and the shared form hint style.

## Fixed

- `Field` now renders the existing `hint` prop.
- `TextInput` keeps the base `input` class when a caller passes `className`.
- `TextArea` now uses the same class merge helper as other fields.
- `SelectInput` keeps both `input` and `select` classes when a caller passes `className`.

## Why this is safe

The JSX structure stays the same for existing calls that do not pass `hint`. The only intentional DOM addition happens when a caller explicitly passes `hint`.
