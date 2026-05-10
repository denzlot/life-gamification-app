# Recovery: safe Stage 7 state

This archive intentionally restores the project to the conservative Stage 7 state before the failed aggressive CSS cleanup.

What this restores:
- `legacy.css` remains present with compatibility styles.
- Existing `!important` declarations are preserved.
- The CSS import order remains the safer staged order from Stage 7.
- The project keeps the component/page refactors completed before the failed final cleanup.

Do not re-apply the previous `css-final-stage-7` archive or patch. That version removed all `!important` declarations and emptied `legacy.css` too aggressively.

Validation commands:

```bash
npm ci
npm run audit:css
npm run typecheck
npm run build
```

Next cleanup rule:
- Remove `!important` only inside one domain at a time.
- After every small removal batch, visually check the affected pages.
- Never empty `legacy.css` in one pass without visual regression testing.
