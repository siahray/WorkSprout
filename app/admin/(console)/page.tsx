import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { InviteForm } from '@/app/admin/invite-form'
import { SignupsTable } from '@/app/admin/signups-table'
import { display } from '@/lib/fonts'
import { btnPrimary, btnSecondary, card, input, label } from '@/lib/ui'
import type { SignupRow } from '@/app/admin/types'

export const metadata: Metadata = {
  title: 'Beta signups · WorkSprout Admin',
}

const STATUSES = new Set(['all', 'invited', 'pending'])

function countInLast7Days(signups: { created_at: string }[]) {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000
  return signups.filter((s) => new Date(s.created_at).getTime() >= since).length
}

function matches(signup: SignupRow, needle: string) {
  if (!needle) return true
  return [signup.email, signup.full_name, signup.profession].some((value) =>
    value?.toLowerCase().includes(needle)
  )
}

function Stat({ label: statLabel, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-control border border-line bg-panel p-5">
      <p className="text-sm text-ink-2">{statLabel}</p>
      <p className={`${display.className} mt-1 text-3xl font-extrabold tabular-nums`}>{value}</p>
    </div>
  )
}

export default async function AdminSignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (claims?.app_metadata?.role !== 'admin') redirect('/admin/login')

  const { data: rows, error } = await supabase
    .from('beta_signups')
    .select('id, email, full_name, profession, created_at, invited_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load signups: ${error.message}`)

  const signups = (rows ?? []) as SignupRow[]
  const q = (params.q ?? '').trim()
  const needle = q.toLowerCase()
  const status = STATUSES.has(params.status ?? '') ? (params.status as string) : 'all'

  const filtered = signups.filter((s) => {
    if (status === 'invited' && !s.invited_at) return false
    if (status === 'pending' && s.invited_at) return false
    return matches(s, needle)
  })

  const invited = signups.filter((s) => s.invited_at).length
  const exportHref = `/admin/signups-export?q=${encodeURIComponent(q)}&status=${status}`

  return (
    <>
      <PageHeader title="Beta signups" description="Everyone who has signed up for the WorkSprout beta.">
        <a href={exportHref} className={btnSecondary} download>
          Export CSV
        </a>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total signups" value={signups.length} />
        <Stat label="Invited" value={invited} />
        <Stat label="Last 7 days" value={countInLast7Days(signups)} />
        <Stat label="Signed in as" value={claims.email ?? claims.sub} />
      </div>

      <div className="mt-8">
        <InviteForm />
      </div>

      <form method="get" action="/admin" className={`${card} mt-8 flex flex-wrap items-end gap-3 p-4`}>
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className={label}>
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Email, name, or profession"
            className={`mt-1.5 ${input}`}
          />
        </div>
        <div>
          <label htmlFor="status" className={label}>
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className={`mt-1.5 ${input}`}>
            <option value="all">All</option>
            <option value="invited">Invited</option>
            <option value="pending">Not invited</option>
          </select>
        </div>
        <button type="submit" className={btnPrimary}>
          Filter
        </button>
        {(q || status !== 'all') && (
          <a href="/admin" className={btnSecondary}>
            Clear
          </a>
        )}
      </form>

      <div className="mt-4">
        <SignupsTable signups={filtered} claimsEmail={claims.email} />
      </div>
    </>
  )
}
