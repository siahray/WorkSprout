# Design system

The workspace UI is built from a small token layer, not from ad-hoc hex values.
The tokens live in `app/globals.css` under `@theme`; the shared class strings
that compose them live in `lib/ui.ts`. Reach for a token before reaching for an
arbitrary value — the alpha-on-Ink habit is what made the app read soft.

## Colour

The brand is four colours: Ink, Sprout, Mango, Sampaguita. What was missing was
a system *between* them, so hierarchy was being drawn by fading Ink. On a green
canvas that produces translucent grey-green, which reads muddy and drops below
4.5:1. Ink is now a five-step ramp mixed toward the canvas, not toward grey.

| Token | Value | Use | On white |
| --- | --- | --- | --- |
| `ink` | `#0E2F27` | primary text, dark surfaces | 13.6:1 |
| `ink-deep` | `#09211B` | rail gradient end, `hover` on dark buttons | — |
| `ink-2` | `#3A5750` | secondary text, cell values | 7.9:1 |
| `ink-3` | `#57706A` | meta, table headers, dates | 5.3:1 |
| `ink-4` | `#8CA09A` | decoration and disabled states only | — |
| `line` / `line-strong` | `#DCE4E0` / `#C6D2CC` | hairlines | — |
| `canvas` / `panel` | `#F4F8F5` / `#FFFFFF` | page paper / surfaces | — |

Meaning colours: `sprout` is "do this", `mango` is "look here", `danger` is void
or negative. Each has a `-wash` tint for chips and alerts (`sprout-wash`,
`mango-wash`, `danger-wash`). `sprout-deep` and `mango-deep` are the readable
text weights of those hues; `mango-strong` is Mango's hover weight.

Two rules:

- **Never build hierarchy by fading text.** Use the ramp step that meets 4.5:1.
  If two things need to separate further, change their size, weight, or position.
- **One accent per screen.** If everything is coloured, nothing is.

## Type

One family for the product: **Geist** (loaded in `app/layout.tsx`, set on `body`).
**Bricolage Grotesque** (`display`) is kept for page titles, hero figures, and the
invoice document — it is the product's signature, so it is spent sparingly.

| Token | Size | Use |
| --- | --- | --- |
| `text-meta` | 12px | meta lines, table headers, captions |
| `text-small` | 13px | secondary content, dense lists |
| `text-body` | 15px | default body text |
| `text-lead` | 17px | statement figures, modal titles |
| `text-title` | 22px | section headings |
| `text-page` | 28px | page titles (`tracking-[-0.02em]`) |
| `text-figure` | 34px | the ledger strip's figures |

Tables stay at 14px (`text-sm`) for density — that is deliberate, not an
oversight. Figures are tabular (`font-variant-numeric` is set globally on `body`,
so it does not depend on every caller remembering `tabular-nums`).

No uppercase tracked labels. Meta labels are sentence case in `ink-3`.

## Surfaces

A panel is paper on the canvas: `border-line`, `shadow-panel` (almost nothing),
radius 14px. It lifts to `shadow-raised` only when it is the thing you are
pointing at. Overlays use `shadow-overlay`. Radii: `rounded-panel` 14px,
`rounded-control` 10px, `rounded-chip` 6px.

Before adding another card, try grouping with a hairline and space instead —
the dashboard's four figures are one panel divided by `gap-px bg-line`, not four
cards with coloured top bars.

## Motion

Defined as `--animate-*` in the theme so a duration cannot drift between
components. `page-in` runs on navigation via `PageTransition`. Everything is
disabled under `prefers-reduced-motion`.

## Sweeping the remaining routes

The sweep is done: every route and component draws from the token layer,
including `app/page.tsx`. The checklist, for a new page or a stray value:

- `text-[#0E2F27]/NN` → the ramp step with adequate contrast (`ink-2`/`ink-3`).
- `rounded-2xl border border-[#0E2F27]/10 bg-white shadow-[…]` → `card`.
- `divide-[#0E2F27]/10` → `divide-line`; `border-[#0E2F27]/10` → `border-line`.
  A hover border, or a checkbox at `/30`, → `border-ink-4`.
- `text-[#1F6B52]` links → `text-sprout-deep`; `bg-[#2E9E6B]`/`bg-[#F4B63F]` →
  `bg-sprout`/`bg-mango`.
- `text-[11px] uppercase tracking-[0.12em]` labels → `meta` (`PageHeader`'s
  `eyebrow` prop already renders sentence case).
- `text-sm` body copy → `text-body`; `text-xs` → `text-meta` or `text-small`.
- A local button, field, label, or error line → the export in `lib/ui.ts`. There
  is one field, one label, one error line, and one Mango call to action.

Body text stays at 14px inside tables, so `text-sm` survives there on purpose.

## Loading and failure

Two surfaces are what make the app feel finished rather than merely styled:

- `app/(app)/loading.tsx` wraps every workspace page in a Suspense boundary, so a
  click paints the shape of the next screen instead of holding the old one still
  until the server answers. `/dashboard` has its own skeleton because it opens on
  the ledger strip. Both are built from `components/ui/skeleton.tsx`.
- `app/(app)/error.tsx` is the workspace error boundary: it says what happened,
  offers the retry, and keeps the frame around the message. This version of Next
  passes `retry` to an error boundary — not the older `reset`.

Body copy is Geist everywhere — including the marketing page, which was the last
place Figtree lived. Bricolage (`display`) is the only other face, and it is spent
on titles, figures, and the invoice.
