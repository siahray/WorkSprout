import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { display } from '@/lib/fonts'
import type { UsageStats } from '@/app/admin/types'

export const metadata: Metadata = {
  title: 'Analytics · WorkSprout Admin',
}

function Tile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-control border border-line bg-panel p-5 shadow-overlay">
      <p className="text-sm text-ink-2">{label}</p>
      <p className={`${display.className} mt-2 text-3xl font-extrabold tabular-nums tracking-tight`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold tracking-wide uppercase text-ink-3">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  )
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (claimsData?.claims?.app_metadata?.role !== 'admin') redirect('/admin/login')

  const { data, error } = await supabase.rpc('admin_usage_stats')
  if (error) throw new Error(`Failed to load analytics: ${error.message}`)

  const stats = (data ?? {}) as UsageStats
  const trackedHours = Math.round(Number(stats.time_minutes ?? 0) / 60)

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className={`${display.className} text-3xl font-extrabold tracking-tight sm:text-4xl`}>
          Analytics
        </h1>
        <p className="text-ink-2">A live snapshot of beta growth and how the product is being used.</p>
      </div>

      <Section title="Growth">
        <Tile label="Accounts" value={stats.users} hint={`${stats.admins} admin${stats.admins === 1 ? '' : 's'}`} />
        <Tile label="Beta signups" value={stats.signups} hint={`${stats.invited} invited`} />
        <Tile label="New signups" value={stats.signups_7d} hint="last 7 days" />
        <Tile label="New signups" value={stats.signups_30d} hint="last 30 days" />
      </Section>

      <Section title="Workspace">
        <Tile label="Clients" value={stats.clients} />
        <Tile label="Projects" value={stats.projects} hint={`${stats.active_projects} active`} />
        <Tile label="Tasks" value={stats.tasks} hint={`${stats.subtasks} subtasks`} />
        <Tile label="To-dos" value={stats.todos} />
      </Section>

      <Section title="Billing">
        <Tile label="Invoices" value={stats.invoices} />
        <Tile label="Payments" value={stats.payments} />
      </Section>

      <Section title="Time & feedback">
        <Tile label="Time entries" value={stats.time_entries} />
        <Tile label="Hours tracked" value={trackedHours} hint="all time" />
        <Tile label="Feedback" value={stats.feedback_total} hint={`${stats.feedback_new} unread`} />
      </Section>
    </div>
  )
}
