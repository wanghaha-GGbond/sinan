# Company identity assets

These images identify the corresponding companies; they do not imply affiliation or endorsement.

The reviewed source URL, retrieval date, company ID/name, original SHA256 and size of every image are recorded in `src/data/company-logo-sources.json` (relative to `apps/web`). Files retain the source bytes and use `<id>-<sha256-prefix>.<extension>` names.

`CompanyLogo` only renders a bundled asset when both company ID and company name match that registry. Missing images fall back to the first character. Do not accept arbitrary remote `logoUrl` values or download assets at request time.

Current coverage: all 20 companies in the initial production catalog, including Alibaba, NetEase, Ant Group, NIO and CATL. Newly submitted/unreviewed companies still use a text placeholder until their identities and assets are reviewed; additional curated company suggestions are not automatically published or seeded.

NetEase uses the icon linked by its official recruitment website (a small 16px original, pending a higher-resolution replacement). Ant Group uses the dark-on-light logo displayed by its official homepage after scrolling, not its white-on-transparent hero logo. Alibaba, NIO and CATL use the original SVGs from the Wikimedia Commons pages recorded in the registry, including those pages' public-domain labels. Restricted media-kit assets were not imported. Source attribution and those labels do not establish a blanket redistribution licence or remove trademark rights; review the source terms before adding or replacing an image, and replace/remove an asset if its use is not permitted.

After edits, run the checksum/identity unit tests and the desktop/mobile, light/dark and failed-image UI tests. Do not claim an asset is live until the corresponding release is deployed and verified.
