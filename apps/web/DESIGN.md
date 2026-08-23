# Sinan Design System

> Living document. Updates ship with code in the same commit.

## Current Web baseline (2026-08)

桌面 Web 与移动 Web 统一采用轻量网页体系；原生 iOS 保留 Solid 立体风格。
当前网页视觉基线借鉴 Glassdoor 的公司/评价信息架构与 Apple 的视觉纪律：
白色或中性内容表面、1px 边框、12px 常规圆角、克制的司南绿、系统字体栈，以及只用于导航和浮层的玻璃材质。

- `WebButton`: `primary | secondary | quiet | danger`，移动端最小 44px 点击区。
- `WebSurface`: `base | raised | overlay | tint | risk`。
- `WebEmptyState`: 统一空数据、无结果和无权限状态。
- `WebNav`、`WebSearchField`、`FilterChip`、`TrustBadge`、`ScoreBadge` 是网页优先组件。
- `SolidButton`、`SolidCard`、`SolidTopbar` 仅作为迁移兼容层；新 Web 业务页面禁止新增引用，原生 App 不受影响。
- 公司页以评价为首屏内容，右侧集中评分分布、可信说明与公司 MBTI（CBTI）证据。

历史 Solid C 端章节保留用于回溯，不再代表当前 Web 规范。

---

## Brief inference

**Reading this as:** B2C 求职/职场产品的 design polish,受众是求职者 + 公司 HR,vibe 是 white-base + green-accent(Linear-clean 偏 Notion-trustworthy),字体 Geist + 中文混排,品牌主绿 #19C37D。

---

## Dials

| Dial | 值 | 理由 |
|---|---|---|
| **VARIANCE** | 5 | Linear-clean,不是 Artsy / Awwwards |
| **MOTION** | 3 | 产品 UI 不是营销页,基本无动效;关键 button / dialog 用 150–200ms ease-out-quart |
| **DENSITY** | 6 | 求职产品信息密度高,metrics 3 列可接受 |

---

## Color

### Scene sentence (为什么 white base,不是 dark)

A 求职者打开司南是早上通勤地铁里、白天午休工位上、晚上回家瘫在沙发上,**没有夜间专属的暗场景**。他想要的是「在已经习惯了的高对比白底上,让公司评价/方向分这些核心数字快速跳进眼睛里」。绿是品牌色,只在大数字、选中态、关键 CTA 上用,不是氛围色。

Dark mode 是**留好的 token**(`@custom-variant dark`),但默认不启用 — 留作未来「夜间通勤模式」的开关,不是默认体验。

### Token system

| Token group | Values |
|---|---|
| `--background` | `#ffffff` (white) |
| `--foreground` | `#111827` (ink) |
| `--muted` | `#f7f8f2` (warm cream) |
| `--primary` | `#19c37d` (brand green) |
| `--primary-hover` | `#0e8f5f` (button) |
| `--primary-deep` | `#047857` (text on light, button hover) |
| `--primary-tint` | `#f0fdf4` (positive / selected tint) |
| `--risk` | `#c76a15` |
| `--risk-surface` | `#fff1d6` |
| `--destructive-bright` | `#dc2626` (auth form errors) |

82% of color values use `oklch()` directly (`@custom-variant dark` block).
18% are product-specific named tokens that read more clearly in code.

### WCAG contrast (passes required)

| Surface | Text | Ratio | AA? |
|---|---|---|---|
| `bg-primary-hover #0E8F5F` | `text-white` | 4.11:1 | AA Large ✅ |
| `bg-primary-deep #047857` | `text-white` | 5.48:1 | AA ✅ |
| `bg-foreground #111827` | `text-white` | 17.74:1 | AAA |
| `bg-muted #f7f8f2` | `text-foreground` | 16.61:1 | AAA |
| `bg-risk-surface #fff1d6` | `text-destructive #92400e` | 7.13:1 | AAA |

---

## Typography

| Step | Size | Use |
|---|---|---|
| `text-xs` | 12px | eyebrows, captions, micro-meta |
| `text-sm` | 14px | body, table cells |
| `text-base` | 16px | paragraph prose |
| `text-lg` | 20px | small headings |
| `text-xl` | 25px | section headers |
| `text-2xl` | 31px | page headings |
| `text-3xl` | 39px | hero on data pages |

Display steps (`lg` → `3xl`) follow a strict **1.25x** ratio per
Impeccable §Typography. Body steps (`xs` → `base`) stay close to
defaults so existing copy doesn't visibly grow.

### CJK rules (globals.css)

```css
body {
  word-break: keep-all;          /* compound CJK words stay together */
  overflow-wrap: anywhere;       /* long English still gets a break */
  line-break: strict;            /* don't break after 。、「 etc */
  text-spacing: trim-start;      /* CJK punct at start trimmed */
  hanging-punctuation: allow-end; /* right-edge tidy */
  font-feature-settings: 'ss01' on, 'cv11' on;  /* Geist alternates */
}
```

| Numeric surface | Class |
|---|---|
| Metric pill, score chip, count | `tabular-nums slashed-zero` |

---

## Spacing / Layout

### Width scale (max-w tokens, no arbitrary pixels)

| Token | Value | Use |
|---|---|---|
| `--container-page` | 1240px | most page-level main width |
| `--container-hero` | 1180px | home and company header |
| `--container-section` | 760px | reading and form pages |
| `--container-form` | 400px | login, register |
| `--container-card` | 420px | cheatsheet, error-state card |
| `--container-prose` | 75ch | long-form body content |
| `--container-prose-sm` | 65ch | dense prose |

### Card-collection responsive grid

Use `--container-card-grid` (`repeat(auto-fit, minmax(280px, 1fr))`)
for card collections. Avoid `md:grid-cols-2/3` — they fail at
in-between viewport widths.

### Z-index (semantic scale)

```
--z-elevated:        20
--z-sticky:          30
--z-dropdown:        40
--z-modal-backdrop:  50
--z-modal:           60
--z-toast:           70
--z-tooltip:         80
--z-fullscreen:      90
```

`z-sticky` (30) and below are layout-level. `z-modal` (60) and
above are overlay-level. Tooltip always above toast; toast
always above modal.

---

## Motion

| Curve | Token | Use |
|---|---|---|
| `--ease-out-quart` | `cubic-bezier(0.25, 1, 0.5, 1)` | button hover, hovers |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | page transitions, drawer |
| `--ease-in-out-quart` | `cubic-bezier(0.76, 0, 0.24, 1)` | toggle / switch |

**Standard duration:** 150ms for buttons, 200ms for dialog
entry, 300ms for page transitions.

`prefers-reduced-motion: reduce` is respected globally in
`globals.css @media (prefers-reduced-motion: reduce)` — every
animation / transition drops to 0.01ms. The `motion-safe:`
Tailwind variant gates hover-lift on the button base.

---

## Components

| Component | Source | Notes |
|---|---|---|
| `WebSurface` | `components/ui/web-surface.tsx` | base, raised, overlay, tint, risk |
| `WebButton` | `components/ui/web-button.tsx` | primary, secondary, quiet, danger |
| `WebNav` | `components/ui/web-nav.tsx` | sticky desktop nav + compact mobile header |
| `WebSearchField` | `components/ui/web-search-field.tsx` | search-first input with keyboard submit |
| `WebEmptyState` | `components/ui/web-empty-state.tsx` | flat empty state surface |
| `SolidCard` | `components/ui/solid-card.tsx` | deprecated Web compatibility wrapper; native App only |
| `SolidButton` | `components/ui/solid-button.tsx` | deprecated Web compatibility wrapper; native App only |
| `SolidTopbar` | `components/ui/solid-topbar.tsx` | deprecated Web compatibility wrapper; native App only |
| `SolidEmptyState` | `components/ui/solid-empty-state.tsx` | deprecated compatibility wrapper |
| `ErrorState` | `components/common/error-state.tsx` | error with retry |
| `MetricPill` | `components/ui/metric-pill.tsx` | data metric chip |
| `ScoreChip` | `components/ui/score-chip.tsx` | direction score |
| `TagPill` | `components/ui/tag-pill.tsx` | tone-aware pill |
| `KeyboardShortcuts` | `components/layout/keyboard-shortcuts.tsx` | `?` opens, `/` focuses search |
| `FirstRunHint` | `components/layout/first-run-hint.tsx` | deprecated; not mounted in Web layout |

---

## Forms

- All inputs use `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
- Inline field-level validation on `onBlur`. Submit-time touch
  all fields, focus first invalid.
- Submit buttons: `<Loader2 className="size-4 animate-spin" />` +
  text on `submitting`, not text-only.
- Draft auto-save: `/submit/review` saves to
  `localStorage` on 1s debounce. 7-day TTL. Restore prompt
  on mount.

---

## Skeletons (shape = final layout)

| Page | Component |
|---|---|
| `/company/[id]` | header + 3 metric cards + hero card + 3 review rows |
| `/rankings` | heading + 4 tab chips + 5 ranking rows |
| `/me` | hero avatar + 3 metric cards + 2 task/badge cards + 3 review rows |

---

## Accessibility

- 14+ `focus-visible:ring-2` instances on interactive elements.
- 0 icon-only buttons without `aria-label`.
- Nav active link has `aria-current="page"`.
- Form errors have `role="alert"`, `aria-invalid`, and
  `aria-describedby` pointing at the matching error `<p>`.
- 44×44 hit area on every interactive (`min-h-11`).
- 0 raw em-dash / en-dash in visible UI text.
- `prefers-reduced-motion: reduce` respected globally.

---

## Tests

- `tests/sinan.spec.ts` — functional e2e (Playwright)
- `tests/visual.spec.ts` — visual regression snapshots, desktop + mobile

Run `npm run test:visual` to update snapshots.

---

## Forbidden patterns (impeccable §Absolute bans)

- side-stripe `border-l/r-*` > 1px as colored accent
- gradient text (`bg-clip-text` + `bg-gradient`)
- glassmorphism as default (1 purposeful instance in
  `dialog.tsx` backdrop)
- identical card grids (use `auto-fit` instead)
- tiny uppercase tracked eyebrow above every section
- numbered section markers (`01 / 02 / 03`)
- text overflow

## Forbidden patterns (taste-skill §AI tells)

- em-dash in visible UI text (use `,` `:` `;` `。`)
- middle-dot `·` between segments in metadata strips
  (use flex + gap-x-2.5 instead, max 1 per line)
- decorative status dot before every nav / list item
- version labels / BETA / ALPHA in hero
- fake-perfect numbers (99.99% / 50% / 1234567)
- hand-rolled SVG icons (use lucide-react — already in deps)
- "streamline / empower / supercharge / unleash / seamless"
  marketing vocabulary

---

## Code patterns

- **No raw hex** in `.tsx` — use semantic token class
  (`bg-primary`, `text-foreground`, etc.). The
  `scripts/migrate-tokens.mjs` script is the canonical
  reference for token → hex mapping.
- **No raw `z-NN`** — use `z-{elevated,sticky,dropdown,modal-backdrop,modal,toast,tooltip,fullscreen}`.
- **No raw `max-w-[NNNpx]`** — use `max-w-{page,hero,section,card,form}`.
- **`focus-visible:` not `focus:`** — focus rings only for
  keyboard users, not mouse clicks.
- **`<button>` not `<div role="button">`** — always.
- **`<label htmlFor>` not `<label>` alone** — always.
