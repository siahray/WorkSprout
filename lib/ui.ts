// Shared Tailwind class strings for the workspace UI.
// Brand: Ink #0E2F27 · Sprout #2E9E6B · Mango #F4B63F · Sampaguita #F4F8F5

export const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

export const card =
  'rounded-2xl border border-[#0E2F27]/10 bg-white shadow-[0_1px_2px_rgba(14,47,39,0.04)]'

export const cardHover =
  'transition-[box-shadow,border-color] hover:border-[#0E2F27]/18 hover:shadow-[0_18px_38px_-26px_rgba(14,47,39,0.55)]'

export const input = `w-full rounded-xl border border-[#0E2F27]/15 bg-white px-3.5 py-2.5 text-[#0E2F27] placeholder:text-[#0E2F27]/35 transition-colors hover:border-[#0E2F27]/30 focus:border-[#2E9E6B] disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

export const label = 'block text-sm font-medium text-[#0E2F27]/80'

export const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-xl bg-[#0E2F27] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1F6B52] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

export const btnAccent = `inline-flex items-center justify-center gap-2 rounded-xl bg-[#2E9E6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#268a5c] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

export const btnSecondary = `inline-flex items-center justify-center gap-2 rounded-xl border border-[#0E2F27]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#0E2F27] shadow-sm transition-all hover:border-[#0E2F27]/25 hover:bg-[#F4F8F5] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

export const btnGhost = `inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#0E2F27]/70 transition-colors hover:bg-[#0E2F27]/5 hover:text-[#0E2F27] disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

export const btnDanger = `inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-all hover:bg-red-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

export const eyebrow = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1F6B52]'

export const sectionTitle = 'text-lg font-bold tracking-tight'

export const tableHead =
  'bg-[#F4F8F5] text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E2F27]/55'

export const th = 'px-5 py-3 font-semibold'

export const rowHover = 'transition-colors hover:bg-[#F4F8F5]/70'

export const alertError =
  'rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700'
export const alertOk = 'rounded-lg bg-[#2E9E6B]/10 px-3 py-2 text-sm font-medium text-[#1F6B52]'
