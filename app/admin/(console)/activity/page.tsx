import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { formatDateTime } from '@/lib/format'
import { card, rowHover, tableHead, th } from '@/lib/ui'
import type { AuditRow } from '@/app/admin/types'

export const metadata: Metadata = {
  title: 'Activity · WorkSprout Admin',
}

export default async function AdminActivityPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (claimsData?.claims?.app_metadata?.role !== 'admin') redirect('/admin/login')

  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('id, actor_email, action, target, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(`Failed to load activity: ${error.message}`)

  const entries = (data ?? []) as AuditRow[]

  return (
    <>
      <PageHeader
        title="Activity"
        description="A log of privileged admin actions — invites, role changes, deletions, and broadcasts."
      />

      <div className={`${card} overflow-hidden`}>
        {entries.length === 0 ? (
          <p className="p-10 text-center text-ink-2">No admin activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>When</th>
                  <th className={th}>Actor</th>
                  <th className={th}>Action</th>
                  <th className={th}>Target</th>
                  <th className={th}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.map((entry) => (
                  <tr key={entry.id} className={rowHover}>
                    <td className="whitespace-nowrap px-5 py-3.5 text-ink-2">
                      {formatDateTime(entry.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-ink-2">{entry.actor_email ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-ink/8 px-2 py-0.5 font-mono text-xs font-semibold text-ink-2">
                        {entry.action}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate px-5 py-3.5 font-mono text-xs text-ink-2">
                      {entry.target ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-2">
                      {entry.metadata && Object.keys(entry.metadata).length > 0
                        ? JSON.stringify(entry.metadata)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
