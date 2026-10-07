import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { display } from '@/lib/fonts'
import { logout } from './actions'
import { AdminLogo } from './logo'
import { InviteForm } from './invite-form'
import { InviteButton } from './invite-button'

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#0E2F27]/12 bg-white p-5">
      <p className="text-sm text-[#0E2F27]/60">{label}</p>
      <p className={`${display.className} mt-1 text-3xl font-extrabold tabular-nums`}>{value}</p>
    </div>
  )
}

function countInLast7Days(signups: { created_at: string }[]) {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000
  return signups.filter((s) => new Date(s.created_at).getTime() >= since).length
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (claims?.app_metadata?.role !== 'admin') {
    redirect('/admin/login')
  }

  const { data: rows, error } = await supabase
    .from('beta_signups')
    .select('id, email, full_name, profession, created_at, invited_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to load signups: ${error.message}`)
  }

  const signups = rows ?? []
  const thisWeek = countInLast7Days(signups)
  const invited = signups.filter((s) => s.invited_at).length

  return (
    <div>
      <header className="border-b border-[#0E2F27]/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <AdminLogo />
          <form action={logout}>
            <button
              type="submit"
              className={`rounded-lg px-3 py-2 text-sm font-medium text-[#0E2F27]/70 hover:text-[#0E2F27] ${focus}`}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className={`${display.className} text-3xl font-extrabold tracking-tight`}>Beta signups</h1>
        <p className="mt-2 text-[#0E2F27]/70">Everyone who has signed up for the WorkSprout beta.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <Stat label="Total signups" value={signups.length} />
          <Stat label="Invited" value={invited} />
          <Stat label="Last 7 days" value={thisWeek} />
          <Stat label="Signed in as" value={claims.email ?? claims.sub} />
        </div>

        <div className="mt-8">
          <InviteForm />
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-[#0E2F27]/12 bg-white">
          {signups.length === 0 ? (
            <p className="p-10 text-center text-[#0E2F27]/60">
              No signups yet. Share the landing page to start collecting beta signups.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F4F8F5] text-left text-[#0E2F27]/60">
                  <tr>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Profession</th>
                    <th className="px-5 py-3 font-medium">Signed up</th>
                    <th className="px-5 py-3 font-medium">Invite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0E2F27]/10">
                  {signups.map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-3.5 font-medium">
                        <span className="flex items-center gap-2">
                          {s.email ?? '—'}
                          {s.email === claims.email && (
                            <span className="rounded-full bg-[#F4B63F]/30 px-2 py-0.5 text-xs font-semibold">
                              You
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#0E2F27]/75">{s.full_name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-[#0E2F27]/75">{s.profession ?? '—'}</td>
                      <td className="px-5 py-3.5 tabular-nums text-[#0E2F27]/65">
                        {new Date(s.created_at).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        {s.email ? (
                          <div className="flex flex-col items-start gap-1">
                            <InviteButton email={s.email} invited={Boolean(s.invited_at)} />
                            {s.invited_at && (
                              <span className="text-xs text-[#0E2F27]/50">
                                Invited{' '}
                                {new Date(s.invited_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#0E2F27]/50">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
