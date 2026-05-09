# CSS cleanup stage 2

This stage moves low-risk page-owned selectors out of `src/styles/legacy.css` and into page files.

## Moved page areas

- `pages/auth.css`: login, register, welcome screen and auth preview ghost styles.
- `pages/profile.css`: profile character layout and compact achievements list.
- `pages/achievements.css`: achievements catalog, filters, progress meter and achievement cards.
- `pages/stats.css`: stats grids and bar chart rows.
- `pages/history.css`: history timeline rows and header actions.
- `pages/admin.css`: admin user rows and stat editing controls.

## Deliberately left in legacy

These selectors are still shared by several pages or risky to move without a visual pass:

- `.page`, `.page-header`, `.section-line`, `.clean-section`
- `.compact-header`, `.split-header`, `.centered-page`, `.centered-title-header`
- `.filter-row`, `.xp-token`, `.hp-token`
- Today, quests, calendar and day-details selectors

## Next stage

Start with reusable components before touching Today/Quests/Calendar. Good candidates: Button, FormFields, EmptyState, Loader, Modal, PageHeader.
