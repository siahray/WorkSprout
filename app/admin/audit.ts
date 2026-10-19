import { logError } from '@/lib/log'
import type { createClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createClient>>
type Actor = { id: string; email?: string | null }

// Append an entry to the admin audit log. Best-effort: failures are logged and
// never block the underlying action.
export async function recordAdminAction(
  supabase: ServerClient,
  actor: Actor,
  action: string,
  target?: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('admin_audit_log').insert({
    actor_id: actor.id,
    actor_email: actor.email ?? null,
    action,
    target: target ?? null,
    metadata: metadata ?? {},
  })

  if (error) logError('audit log failed', { error })
}
