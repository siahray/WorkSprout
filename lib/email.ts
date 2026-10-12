// Transactional email via Resend's REST API. We deliberately avoid an SDK —
// the whole surface is one POST, and it keeps the dependency tree tiny.

export type EmailAttachment = {
  filename: string
  // Base64-encoded file contents, as Resend expects.
  content: string
}

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

export type SendEmailResult = { ok: true; id?: string } | { ok: false; error: string }

export function emailFrom(): string | null {
  const from = process.env.EMAIL_FROM ?? process.env.RESEND_FROM
  return from?.trim() || null
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && emailFrom())
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = emailFrom()
  if (!apiKey || !from) {
    return { ok: false, error: 'Email is not configured yet. Add RESEND_API_KEY and EMAIL_FROM.' }
  }

  const to = Array.isArray(input.to) ? input.to : [input.to]
  if (to.length === 0) return { ok: false, error: 'No recipient address was provided.' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
        attachments: input.attachments,
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('resend send failed:', res.status, detail)
      return { ok: false, error: 'The email provider rejected the message — please try again.' }
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { ok: true, id: data.id }
  } catch (error) {
    console.error('resend send error:', error)
    return { ok: false, error: 'Could not reach the email provider — please try again.' }
  }
}
