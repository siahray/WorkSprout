'use server'

import { createClient } from '@/lib/supabase/server'
import { optionalText, text, type FormState } from '@/lib/validation'

export async function submitFeedback(_prev: FormState, formData: FormData): Promise<FormState> {
  const message = text(formData, 'message')
  const page = optionalText(formData, 'page')

  if (!message) return { error: 'Tell us a little more before sending.' }
  if (message.length > 4000) return { error: 'Keep it under 4000 characters.' }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  const { error } = await supabase.from('feedback').insert({
    user_id: claims?.sub ?? null,
    email: claims?.email ?? null,
    message,
    page,
  })

  if (error) {
    console.error('submit feedback failed:', error.message)
    return { error: 'Could not send your feedback — please try again.' }
  }

  return { ok: 'Thanks — your feedback is in.' }
}
