import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { BroadcastForm } from '@/app/admin/broadcast-form'
import { formatDateTime } from '@/lib/format'
import { card, rowHover, tableHead, th } from '@/lib/ui'
import type { BroadcastRow, UsageStats } from '@/app/admin/types'

export const metadata: Metadata = {
  title: 'Broadcast · WorkSprout Admin',
}

function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    sent: 'bg-[#2E9E6B]/12 text-[#1F6B52]',
    partial: 'bg-[#F4B63F]/30 text-[#8a5a00]',
    failed: 'bg-red-100 text-red-700',
    not_configured: 'bg-[#0E2F27]/8 text-[#0E2F27]/70',
  }
  const labels: Record<string, string> = {
    sent: 'Sent',
    partial: 'Partial',
    failed: 'Failed',
    not_configured: 'Not configured',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tones[status] ?? tones.not_configured}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default async function AdminBroadcastPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (claimsData?.claims?.app_metadata?.role !== 'admin') redirect('/admin/login')

  const [statsRes, historyRes] = await Promise.all([
    supabase.rpc('admin_usage_stats'),
    supabase
      .from('admin_broadcasts')
      .select('id, subject, audience, recipient_count, provider, status, error, created_at')
      .order('created_at', { ascending: false })
      .limit(25),
  ])

  const stats = (statsRes.data ?? {}) as UsageStats
  const history = (historyRes.data ?? []) as BroadcastRow[]
  const configured = Boolean(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM ?? process.env.RESEND_FROM))

  return (
    <>
      <PageHeader
        title="Broadcast"
        description="Send an announcement to a slice of your beta audience, and keep a record of what went out."
      />

      {!configured && (
        <div className="mb-6 rounded-xl border border-[#F4B63F]/40 bg-[#F4B63F]/12 px-4 py-3 text-sm text-[#7a5200]">
          Email is not configured yet. Set <code className="font-semibold">RESEND_API_KEY</code> and{' '}
          <code className="font-semibold">EMAIL_FROM</code> in the environment to enable sending. Broadcasts
          attempted before then are recorded as “not configured”.
        </div>
      )}

      <BroadcastForm
        counts={{
          signups: stats.signups ?? 0,
          invited: stats.invited ?? 0,
          users: stats.users ?? 0,
        }}
      />

      <h2 className="mt-10 text-lg font-bold tracking-tight">Recent broadcasts</h2>
      <div className={`${card} mt-3 overflow-hidden`}>
        {history.length === 0 ? (
          <p className="p-10 text-center text-[#0E2F27]/60">No broadcasts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>When</th>
                  <th className={th}>Subject</th>
                  <th className={th}>Audience</th>
                  <th className={`${th} text-right`}>Recipients</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0E2F27]/10">
                {history.map((row) => (
                  <tr key={row.id} className={rowHover}>
                    <td className="px-5 py-3.5 text-[#0E2F27]/70">{formatDateTime(row.created_at)}</td>
                    <td className="px-5 py-3.5 font-medium">
                      {row.subject}
                      {row.error && <span className="mt-0.5 block text-xs text-red-600">{row.error}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[#0E2F27]/70">{row.audience}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[#0E2F27]/70">
                      {row.recipient_count}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.status} />
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
