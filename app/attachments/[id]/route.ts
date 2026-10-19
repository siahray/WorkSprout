import { logError } from '@/lib/log'
import { createClient } from '@/lib/supabase/server'
import { ATTACHMENT_BUCKET } from '@/lib/attachments'
import { isUuid } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// Signs a short-lived URL for a private attachment and redirects to it. `?download`
// forces a file-download disposition using the original filename; otherwise the
// object is served inline (so images can be previewed directly).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return new Response('Not found', { status: 404 })

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) return new Response('Unauthorized', { status: 401 })

  // RLS scopes this select to the caller's own attachments.
  const { data: attachment } = await supabase
    .from('attachments')
    .select('name, path')
    .eq('id', id)
    .maybeSingle()

  if (!attachment) return new Response('Not found', { status: 404 })

  const download = new URL(request.url).searchParams.has('download')
  const { data: signed, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(attachment.path, 60, download ? { download: attachment.name } : undefined)

  if (error || !signed) {
    logError('sign attachment failed', { error })
    return new Response('Could not open that file — please try again.', { status: 500 })
  }

  return Response.redirect(signed.signedUrl, 302)
}
