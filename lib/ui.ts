// Shared Tailwind class strings for the workspace UI.
// Brand: Ink #0E2F27 · Sprout #2E9E6B · Mango #F4B63F · Sampaguita #F4F8F5

export const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

export const card = 'rounded-xl border border-[#0E2F27]/12 bg-white'

export const input = `w-full rounded-xl border border-[#0E2F27]/20 bg-white px-3.5 py-2.5 text-[#0E2F27] placeholder:text-[#0E2F27]/40 disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

export const label = 'block text-sm font-medium text-[#0E2F27]/80'

export const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-xl bg-[#0E2F27] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1F6B52] disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

export const btnAccent = `inline-flex items-center justify-center gap-2 rounded-xl bg-[#2E9E6B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#268a5c] disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

export const btnSecondary = `inline-flex items-center justify-center gap-2 rounded-xl border border-[#0E2F27]/20 bg-white px-4 py-2.5 text-sm font-semibold text-[#0E2F27] transition-colors hover:bg-[#F4F8F5] disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

export const btnGhost = `inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#0E2F27]/70 transition-colors hover:text-[#0E2F27] disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

export const btnDanger = `inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

export const sectionTitle = 'text-lg font-bold tracking-tight'

export const alertError =
  'rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700'
export const alertOk = 'rounded-lg bg-[#2E9E6B]/10 px-3 py-2 text-sm font-medium text-[#1F6B52]'
