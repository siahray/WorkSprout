import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', claims.sub)
    .maybeSingle()

  const { data: active } = await supabase
    .from('time_entries')
    .select('id, start_time, paused_at, paused_seconds, task:tasks(title, project:projects(name))')
    .is('end_time', null)
    .maybeSingle()

  const task = active?.task as unknown as
    | { title: string; project: { name: string } | null }
    | null
    | undefined
  const label = task?.project?.name ? `${task.project.name} · ${task.title}` : task?.title ?? 'Timer running'

  return (
    <AppShell
      email={claims.email ?? ''}
      name={profile?.business_name || profile?.full_name || ''}
      active={
        active
          ? {
              id: active.id,
              startTime: active.start_time,
              pausedAt: active.paused_at,
              pausedSeconds: active.paused_seconds ?? 0,
              label,
            }
          : null
      }
    >
      {children}
    </AppShell>
  )
}
