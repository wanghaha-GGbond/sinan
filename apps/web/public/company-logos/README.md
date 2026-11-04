# Company identity assets

These images identify the corresponding companies; they do not imply affiliation or endorsement.

The reviewed source URL, retrieval date, company ID/name, original SHA256 and size of every image are recorded in `src/data/company-logo-sources.json` (relative to `apps/web`). Files retain the source bytes and use `<id>-<sha256-prefix>.<extension>` names.

`CompanyLogo` only renders a bundled asset when both company ID and company name match that registry. Missing images fall back to the first character. Do not accept arbitrary remote `logoUrl` values or download assets at request time.

Current coverage: 15 companies. Alibaba, NetEase, Ant Group, NIO and CATL still use text placeholders. Restricted media-kit assets were not imported. Source attribution does not establish a blanket redistribution licence; review the source terms before adding or replacing an image, and replace/remove an asset if its use is not permitted.

After edits, run the checksum/identity unit tests and the desktop/mobile, light/dark and failed-image UI tests. Do not claim an asset is live until the corresponding release is deployed and verified.
