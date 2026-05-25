# Rating Page Spec

Route: `/company/[id]/ratings`

Primary example: `/company/northstar-tech/ratings`

## Current Direction

The rating route is no longer a report-style dashboard. It should behave like a company-specific review feed with a light scoring entry.

The primary user behavior is reading real anonymous reviews.

## Required Modules

- Compact company header
- Direction score as secondary context
- Review feed as the primary surface
- 0-10 score picker
- One-line short note input after selecting a score
- Anonymous safety reminder
- One complete-review entry point

## Score Meaning

- 9-10: 强烈推荐，较少明显风险
- 8-8.9: 整体较好，适合重点考虑
- 7-7.9: 可以考虑，但要看具体岗位
- 6-6.9: 机会与风险并存
- 5-5.9: 不确定性较高
- 4-4.9: 风险较明显
- 0-3.9: 高风险，建议谨慎

## Interaction Rules

- Selecting a score must show a clear selected state.
- Selecting a score reveals the short note input.
- Short note has a visible character count.
- Submission opens success feedback without page refresh.
- No real API call in MVP.
- Safety copy must remind users not to include personally identifiable information.

## Tone

The page can have participation, but should stay restrained, useful, anonymous, and career-decision oriented.

Avoid turning this route into a company analysis report with too many charts, summary modules, and repeated CTAs.
