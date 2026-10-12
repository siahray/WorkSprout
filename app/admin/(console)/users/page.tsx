import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { formatDate, formatDateTime, hoursFromMinutes } from '@/lib/format'
import { btnDanger, btnSecondary, card, input, label, rowHover, tableHead, th } from '@/lib/ui'
import { setUserBanned, setUserRole } from '@/app/admin/admin-actions'
import type { AdminUser } from '@/app/admin/types'

export const metadata: Metadata = {
  title: 'Users · WorkSprout Admin',
}

function Badge({ tone, children }: { tone: 'admin' | 'active' | 'suspended'; children: string }) {
  const tones = {
    admin: 'bg-[#0E2F27] text-white',
    active: 'bg-[#2E9E6B]/12 text-[#1F6B52]',
    suspended: 'bg-red-100 text-red-700',
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  if (claims?.app_metadata?.role !== 'admin') redirect('/admin/login')

  const { data, error } = await supabase.rpc('admin_list_users')
  if (error) throw new Error(`Failed to load users: ${error.message}`)

  const q = (params.q ?? '').trim().toLowerCase()
  const users = ((data ?? []) as AdminUser[]).filter((u) =>
    q ? [u.email, u.full_name, u.business_name].some((v) => v?.toLowerCase().includes(q)) : true
  )

  return (
    <>
      <PageHeader title="Users" description="Every account, with the ability to grant admin or suspend access.">
        <span className={`${card} px-3 py-1.5 text-sm text-[#0E2F27]/70`}>
          {users.length} user{users.length === 1 ? '' : 's'}
        </span>
      </PageHeader>

      <form method="get" action="/admin/users" className={`${card} flex flex-wrap items-end gap-3 p-4`}>
        <div className="min-w-[240px] flex-1">
          <label htmlFor="q" className={label}>
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Email, name, or business"
            className={`mt-1.5 ${input}`}
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-[#0E2F27] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1F6B52]"
        >
          Search
        </button>
        {q && (
          <a href="/admin/users" className={btnSecondary}>
            Clear
          </a>
        )}
      </form>

      <div className={`${card} mt-4 overflow-hidden`}>
        {users.length === 0 ? (
          <p className="p-10 text-center text-[#0E2F27]/60">No users match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>User</th>
                  <th className={th}>Role</th>
                  <th className={th}>Status</th>
                  <th className={th}>Joined</th>
                  <th className={th}>Last seen</th>
                  <th className={th}>Activity</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0E2F27]/10">
                {users.map((u) => {
                  const isAdmin = u.app_role === 'admin'
                  const isSelf = u.id === claims.sub
                  return (
                    <tr key={u.id} className={rowHover}>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-2 font-medium">
                          {u.full_name || u.business_name || '—'}
                          {isSelf && (
                            <span className="rounded-full bg-[#F4B63F]/30 px-2 py-0.5 text-xs font-semibold">
                              You
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-[#0E2F27]/55">{u.email ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={isAdmin ? 'admin' : 'active'}>{isAdmin ? 'Admin' : 'Member'}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={u.banned ? 'suspended' : 'active'}>
                          {u.banned ? 'Suspended' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-[#0E2F27]/70">{formatDate(u.created_at)}</td>
                      <td className="px-5 py-3.5 text-[#0E2F27]/70">
                        {u.last_sign_in_at ? formatDateTime(u.last_sign_in_at) : 'Never'}
                      </td>
                      <td className="px-5 py-3.5 text-[#0E2F27]/70">
                        <span className="tabular-nums">
                          {u.projects} proj · {u.clients} cli · {u.invoices} inv
                        </span>
                        <span className="block text-xs text-[#0E2F27]/50">
                          {hoursFromMinutes(Number(u.time_minutes))} tracked
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-start justify-end gap-2">
                          {isSelf ? (
                            <span className="text-xs text-[#0E2F27]/45">—</span>
                          ) : (
                            <>
                              {isAdmin ? (
                                <ConfirmAction
                                  action={setUserRole}
                                  id={u.id}
                                  extra={{ is_admin: '0' }}
                                  message={`Remove admin access from ${u.email ?? 'this user'}?`}
                                  className={`${btnSecondary} px-2.5 py-1.5 text-xs`}
                                >
                                  Revoke admin
                                </ConfirmAction>
                              ) : (
                                <ConfirmAction
                                  action={setUserRole}
                                  id={u.id}
                                  extra={{ is_admin: '1' }}
                                  message={`Grant admin access to ${u.email ?? 'this user'}?`}
                                  className={`${btnSecondary} px-2.5 py-1.5 text-xs`}
                                >
                                  Make admin
                                </ConfirmAction>
                              )}
                              {u.banned ? (
                                <ConfirmAction
                                  action={setUserBanned}
                                  id={u.id}
                                  extra={{ banned: '0' }}
                                  message={`Restore access for ${u.email ?? 'this user'}?`}
                                  className={`${btnSecondary} px-2.5 py-1.5 text-xs`}
                                >
                                  Restore
                                </ConfirmAction>
                              ) : (
                                <ConfirmAction
                                  action={setUserBanned}
                                  id={u.id}
                                  extra={{ banned: '1' }}
                                  message={`Suspend ${u.email ?? 'this user'}? They will be signed out and blocked.`}
                                  className={`${btnDanger} px-2.5 py-1.5 text-xs`}
                                >
                                  Suspend
                                </ConfirmAction>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
