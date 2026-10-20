// The two auth emails we send ourselves: the invite and the password reset.
//
// Same construction as lib/call-email.ts — table-based with inline styles, so
// it survives mail-client sanitising — and the same four brand colours. These
// are the messages that used to arrive in Supabase's own template; they are
// WorkSprout's now, from the sender down.

const INK = '#0E2F27'
const MANGO = '#F4B63F'
const SOFT = '#F4F8F5'
const MUTED = '#5b6b66'

function esc(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type AuthEmail = { subject: string; html: string; text: string }

// The shared frame: Ink header, one Mango button, a footer that says who sent
// it and what to do if it was not you. Both messages are one action and one
// paragraph, so the frame carries almost all of it.
function frame(input: {
  heading: string
  body: string
  buttonLabel: string
  link: string
  after: string
  footnote: string
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:${SOFT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(14,47,39,0.1);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:${INK};padding:20px 32px;">
                <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.01em;">WorkSprout</span>
                <span style="color:rgba(255,255,255,0.6);font-size:12px;float:right;line-height:22px;">Beta</span>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px 0;">
                <h1 style="margin:0 0 10px;color:${INK};font-size:20px;font-weight:700;letter-spacing:-0.01em;">${esc(input.heading)}</h1>
                <p style="margin:0;color:${MUTED};font-size:14px;line-height:1.6;">${esc(input.body)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 4px;">
                <a href="${esc(input.link)}" style="display:inline-block;background:${MANGO};color:${INK};text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:10px;">${esc(input.buttonLabel)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 32px 28px;">
                <p style="margin:0;color:${MUTED};font-size:13px;line-height:1.6;">${esc(input.after)}</p>
              </td>
            </tr>
            <tr>
              <td style="background:${SOFT};padding:20px 32px;border-top:1px solid rgba(14,47,39,0.08);">
                <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.6;">${esc(input.footnote)}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#9aa8a3;font-size:11px;">WorkSprout &middot; Track the work. Send the invoice. Get paid.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function renderInviteEmail(input: { link: string; invitedBy?: string | null }): AuthEmail {
  const invitedBy = input.invitedBy?.trim()

  return {
    subject: 'Your WorkSprout invite',
    html: frame({
      heading: 'You are invited to WorkSprout',
      body: invitedBy
        ? `${invitedBy} invited you to the WorkSprout beta. Set a password and you are in — clients, tasks, hours, invoices, and payments in one place.`
        : 'You have been invited to the WorkSprout beta. Set a password and you are in — clients, tasks, hours, invoices, and payments in one place.',
      buttonLabel: 'Set your password',
      link: input.link,
      after: 'The link works once and expires in 24 hours. Open it in this browser or any other — it does not have to be the one you are reading this on.',
      footnote: 'If you were not expecting this invite, you can ignore it — no account is created until you set a password.',
    }),
    text: [
      'You are invited to WorkSprout',
      '',
      invitedBy ? `${invitedBy} invited you to the WorkSprout beta.` : 'You have been invited to the WorkSprout beta.',
      'Set a password and you are in.',
      '',
      `Set your password: ${input.link}`,
      '',
      'The link works once and expires in 24 hours.',
      'If you were not expecting this invite, you can ignore it.',
    ].join('\n'),
  }
}

export function renderResetEmail(input: { link: string }): AuthEmail {
  return {
    subject: 'Reset your WorkSprout password',
    html: frame({
      heading: 'Reset your password',
      body: 'Someone asked to reset the password on your WorkSprout account. If that was you, choose a new one below.',
      buttonLabel: 'Choose a new password',
      link: input.link,
      after: 'The link works once and expires in an hour. Your current password stays active until you set a new one.',
      footnote: 'If you did not ask for this, you can ignore this email — nothing has changed.',
    }),
    text: [
      'Reset your WorkSprout password',
      '',
      'Someone asked to reset the password on your WorkSprout account.',
      'If that was you, choose a new one here:',
      '',
      input.link,
      '',
      'The link works once and expires in an hour.',
      'If you did not ask for this, you can ignore this email.',
    ].join('\n'),
  }
}
