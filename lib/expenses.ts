// Client-safe expense helpers: the category picklist and its badge tints.
// Currency is PHP; amounts are numeric(12,2).

export const EXPENSE_CATEGORIES = [
  'Software',
  'Internet & utilities',
  'Hardware',
  'Travel',
  'Office & supplies',
  'Marketing',
  'Services & subcontractors',
  'Fees & taxes',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && (EXPENSE_CATEGORIES as readonly string[]).includes(value)
}

const badgeTints: Record<string, string> = {
  Software: 'bg-[#2E9E6B]/12 text-[#1F6B52]',
  'Internet & utilities': 'bg-[#F4B63F]/25 text-[#8a6412]',
  Hardware: 'bg-[#0E2F27]/10 text-[#0E2F27]/80',
  Travel: 'bg-[#2E9E6B]/8 text-[#2E9E6B]',
  'Office & supplies': 'bg-[#0E2F27]/6 text-[#0E2F27]/70',
  Marketing: 'bg-[#F4B63F]/15 text-[#8a6412]',
  'Services & subcontractors': 'bg-[#2E9E6B]/8 text-[#1F6B52]',
  'Fees & taxes': 'bg-red-50 text-red-700',
  Other: 'bg-[#0E2F27]/6 text-[#0E2F27]/60',
}

export function categoryBadge(category: string | null | undefined): string {
  const tint = badgeTints[category ?? ''] ?? badgeTints.Other
  return `rounded-full ${tint} px-2.5 py-0.5 text-xs font-medium`
}