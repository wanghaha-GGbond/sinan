# Navigation data loading

## Behavior

- Home, directory, rankings, search suggestions and company verification share
  the `companies/search` query cache in the root QueryProvider.
- Identical in-flight requests are deduplicated. Data stays fresh for 60 seconds
  and inactive queries are retained for 10 minutes. Stale data is displayed while
  refreshing; a failed refresh does not discard a populated cached list.
- Search keys include normalized keyword, city and industry. New keywords retain
  the previous list with an updating indicator; clearing the keyword hides results.
- Only public catalog, sentiment and public promise-record responses receive
  `Cache-Control: public, max-age=60, stale-while-revalidate=300` on success.
  Authenticated review lists, account data and mutations are not given public caching.
  These headers alone do not demonstrate Cloudflare edge-cache hits. Public changes
  may take a short time to appear; this is not a cache for moderation decisions.
- Company detail aggregates and CBTI signals run concurrently. Review retrieval
  overlaps authentication, while blocked-author filtering remains intact.
- Search groups review signals by company once, replacing a full signal scan per
  company: grouping changes from O(companies × signals) to O(companies + signals),
  excluding the unchanged per-company CBTI algorithm.

## Verification

From `apps/web`:

```sh
npm run test:unit
npm run lint
npm run build:cf
npm run test:performance
```

The browser performance suite uses the production build on port 3197 with an empty
database URL and intercepted API fixtures. It tests desktop and mobile navigation
and slow searches without touching real accounts or production data.

On 2026-09-19: 70 unit tests and 4 browser tests passed. The browser test verifies
one catalog request across home → directory → home → search within the fresh window.
This is a repeat-navigation/request-count result, not an end-to-end speed benchmark.
No representative before/after LCP or INP trace has been collected. Overseas network
latency, first-load JS and database wake-up time are not removed by these changes.

The search transition follows the upstream
[TanStack placeholder-data pattern](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries).
