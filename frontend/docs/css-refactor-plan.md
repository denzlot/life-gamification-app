# CSS refactor plan

The frontend CSS now enters through `src/styles/index.ts`. Do not add new rules to `src/index.css`.

## Folder layout

- `fonts.css` stores the external font import.
- `base.css`, `layout.css`, `navigation.css`, `buttons.css`, `forms.css`, `components.css` are reserved for shared styles that have a clear owner.
- `pages/*.css` stores page-owned selectors that were confirmed from JSX usage.
- `legacy.css` contains the remaining old cascade, shared utilities and risky repair layers.

## Stage 2 status

Simple page-owned selectors have been moved from `legacy.css` into `src/styles/pages/` for Auth, Profile, Achievements, Stats, History and Admin.

## Migration rule

Move styles out of `legacy.css` one page or component at a time. After every move, run:

```bash
npm run audit:css
npm run build
```

Avoid adding new `!important`. If a rule needs it, leave a short comment explaining why.
