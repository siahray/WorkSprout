// Shared Tailwind class strings for the workspace UI.
// Brand: Ink #0E2F27 · Sprout #2E9E6B · Mango #F4B63F · Sampaguita #F4F8F5
//
// Every token named here is defined in app/globals.css (@theme): the five-step
// ink ramp, line/canvas/panel, the meaning colours, the text-* scale, and the
// panel/control radii. Reach for a token before reaching for an arbitrary hex —
// the alpha-on-ink habit is what made the app read soft.

export const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sprout'

/* Surfaces. A panel is paper on the canvas: hairline, almost no shadow, and it
   lifts only when it is the thing you are pointing at. */
export const panel = 'rounded-panel border border-line bg-panel shadow-panel'
/** `card` is the older name for the same thing, kept while the sweep reaches
    the remaining pages. */
export const card = panel
export const cardHover = 'transition-[box-shadow,border-color] hover:border-line-strong hover:shadow-raised'

/* Text. Hierarchy is size and weight; nothing here is a faded ink. */
export const meta = 'text-meta font-medium text-ink-3'
/** Pages not yet swept still call this `eyebrow`; sentence case, no tracking. */
export const eyebrow = meta
export const sectionTitle = 'text-title font-bold tracking-tight text-ink'
export const bodyText = 'text-body text-ink-2'
export const link = 'font-medium text-sprout-deep underline-offset-2 hover:underline'

/* Controls. */
export const input = `w-full rounded-control border border-line-strong bg-panel px-3 py-2 text-body text-ink placeholder:text-ink-4 transition-colors hover:border-ink-4 focus:border-sprout disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-3 ${focus}`
export const label = 'block text-small font-medium text-ink-2'

const button = `inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-body font-semibold transition-all active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 ${focus}`

export const btnPrimary = `${button} bg-ink text-white hover:bg-ink-deep`
/** The accent. Mango, not Sprout: green is the brand's *mark* colour (the logo,
    the status dot, the paid stamp) and never a button fill — a green button read
    as a second, competing brand next to Ink and Mango. */
export const btnMango = `${button} bg-mango text-ink hover:bg-mango-strong`
export const btnSecondary = `${button} border border-line-strong bg-panel text-ink hover:border-ink-4 hover:bg-canvas`
export const btnGhost = `inline-flex items-center justify-center gap-2 rounded-control px-3 py-2 text-small font-medium text-ink-2 transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-55 ${focus}`
export const btnDanger = `${button} border border-danger/25 bg-panel text-danger hover:bg-danger-wash`

/* Tables read as a ledger: quiet sentence-case headers, hairline row rules,
   figures right-aligned and tabular. */
export const tableHead = 'border-b border-line text-left text-meta font-medium text-ink-3'
export const th = 'px-5 py-2.5'
export const rowHover = 'transition-colors hover:bg-canvas'

/* Panel chrome. */
export const panelHeader = 'flex items-center justify-between gap-3 border-b border-line px-5 py-3.5'
export const panelTitle = 'text-body font-semibold text-ink'

export const alertError = 'rounded-control bg-danger-wash px-3 py-2 text-small font-medium text-danger'
export const alertOk = 'rounded-control bg-sprout-wash px-3 py-2 text-small font-medium text-sprout-deep'

/* The rail behind the navigation: a woven texture over Ink deepening to
   Ink-deep, so the sidebar has depth instead of sitting flat. Shared so the
   desktop rail and the mobile drawer cannot drift apart. */
export const railSurface = {
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(255,255,255,.035) 0 2px, transparent 2px 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,.035) 0 2px, transparent 2px 16px), linear-gradient(180deg, #0e2f27 0%, #09211b 100%)',
}
