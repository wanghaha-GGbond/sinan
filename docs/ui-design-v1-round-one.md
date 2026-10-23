# Zaichang UI V1: First Review

## Scope

Phase 1 foundations and Phase 2 homepage, company directory, and company
overview. This is a presentation-only change on the existing independent UI
branch. It does not change APIs, storage, permissions, migrations, iOS, CI, or
production deployment settings. No production deployment is performed.

Research, Pulse, authentication, and review submission page redesigns await
visual approval. Shared tokens and primitives already affect those pages.

## Design Decisions

- White-first semantic palette, violet limited to actions, selection, and focus.
- System font stack, compact heading scale, 1200px page maximum, 64/56px header.
- 44px action targets, 10px controls, 12px framed surfaces, circular initials.
- Continuous company rows with five-point display scores and review counts.
  Stored direction scores remain on the original ten-point scale.
- No-sample companies have no default star rating. Detail score distributions
  retain the original interval labels and actual sample counts, explicitly
  labelled as ten-point scores. No inferred percentage chart is fabricated.
- Company overview uses a compact identity header, flat insights, review content,
  and a secondary evidence column. The active overview tab is now correct.
- Loading skeletons follow row geometry. Search, city selection, sorting, empty
  results, retry feedback, keyboard focus, and reduced-motion support remain.
- Existing unimplemented follow/filter controls are explicitly disabled;
  advanced filter placeholders are tucked into the expandable filter area.
  Existing review classification and tag-filter functions are unchanged.

## Files

All source paths below are relative to `apps/web/src/`.

- `app/globals.css`: tokens, typography, surfaces, responsive navigation, focus.
- `app/page.tsx`, `app/companies/page.tsx`, `app/company/[id]/page.tsx`: core pages.
- `components/layout/app-shell.tsx`: footer alignment and touch targets.
- `components/ui/button.tsx`, `web-button.tsx`, `solid-button.tsx`, `input.tsx`,
  `solid-search-input.tsx`, `tag-pill.tsx`, `web-nav.tsx`: shared primitives.
- `components/company/company-card.tsx`, `company-rating.tsx`,
  `company-directory.tsx`, `company-list-skeleton.tsx`, `home-company-feed.tsx`,
  `home-company-search.tsx`: company rows, shared score display, search states.
- `components/company/company-decision-insights.tsx`,
  `company-evidence-rail.tsx`, `company-review-feed.tsx`: detail information layout.
- `components/review/review-card.tsx`: readable preview hierarchy and neutral stars.
- `apps/web/tests/ui-foundations.spec.ts`: responsive/interaction regression tests.
- `apps/web/tests/copy-interactions.spec.ts`: scope Pulse assertion to the active
  main region because Next can retain inactive route DOM.

## Validation

- Web ESLint: passed.
- Playwright: 19 checks passed. Three pages at 1440, 1280, 768, 390, and 375px;
  no page overflow, no captured browser console errors or uncaught exceptions.
  Also checked search submission, city/sort filters, absent ratings, empty search,
  navigation menus, research methodology, registration privacy, and Pulse labels.
- TypeScript: blocked by existing missing local dependencies:
  `@opennextjs/cloudflare`, `@types/pg`, `@alicloud/dm20151123`,
  `@alicloud/openapi-client`, `@alicloud/credentials`.
- Production build attempted with `next build --webpack`: blocked by the same
  three missing AliCloud mail SDK modules. No production build success claimed.
- Local Next runtime is 16.2.6, while the manifest requests 16.3.4.
  Complete dependency installation and CI verification remain required.
- The disk-full development error was resolved by removing only regenerable
  project npm/Next caches and restarting the local preview.

Screenshots in `screenshots/ui-v1/` use existing local example company data, not
live company metrics. They are layout evidence, not claims about real employers.

## Review Checkpoint

Please review the first-round desktop/mobile hierarchy and violet emphasis
before extending this design to research, Pulse, and forms. The project owner
must review the PR and pass required CI before merging. Existing dependency-audit
and staging-credential CI blockers from the prior PR revision are separate from
this UI work and need owner attention.
