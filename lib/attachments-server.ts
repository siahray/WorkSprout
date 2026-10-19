import type { SupabaseClient } from '@supabase/supabase-js'
import { ATTACHMENT_BUCKET } from '@/lib/attachments'
import { logError } from '@/lib/log'

// Best-effort removal of Storage objects for attachment rows that are going away.
// Deleting the DB row does not remove the underlying object, so callers must do
// this before cascading deletes (project/invoice) or explicit removals.
export async function removeAttachmentObjects(
  client: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<void> {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))]
  if (unique.length === 0) return

  const { error } = await client.storage.from(ATTACHMENT_BUCKET).remove(unique)
  if (error) logError('remove attachment objects failed', { error })
}

// Fetches the storage paths for every attachment of a parent, used before the
// parent row (and its cascading attachment rows) is deleted.
export async function attachmentPathsForParent(
  client: SupabaseClient,
  parent: { project_id: string } | { invoice_id: string } | { expense_id: string },
): Promise<string[]> {
  const { data } =
    'project_id' in parent
      ? await client.from('attachments').select('path').eq('project_id', parent.project_id)
      : 'invoice_id' in parent
        ? await client.from('attachments').select('path').eq('invoice_id', parent.invoice_id)
        : await client.from('attachments').select('path').eq('expense_id', parent.expense_id)

  return (data ?? []).map((row) => (row as { path: string }).path)
}

// Same, but for a set of projects (used when a client deletion cascades through
// all of its projects).
export async function attachmentPathsForProjectIds(
  client: SupabaseClient,
  projectIds: string[],
): Promise<string[]> {
  const ids = [...new Set(projectIds.filter(Boolean))]
  if (ids.length === 0) return []

  const { data } = await client.from('attachments').select('path').in('project_id', ids)
  return (data ?? []).map((row) => (row as { path: string }).path)
}
