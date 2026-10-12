// Branded email inviting a client to a scheduled call. Table-based with inline
// styles so it survives mail-client sanitising.

import type { CallSnapshot } from '@/lib/call'
import { callJoinUrl, callWhen } from '@/lib/call'

const INK = '#0E2F27'
const SPROUT = '#2E9E6B'
const SOFT = '#F4F8F5'

function esc(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type CallEmail = { subject: string; html: string; text: string }

export function renderCallEmail(call: CallSnapshot, link: string | null, icsAttached: boolean): CallEmail {
  const businessName = call.business.name
  const firstName = (call.client?.name ?? '').trim().split(/\s+/)[0] || 'there'
  const when = callWhen(call.scheduledAt, call.durationMinutes)
  const join = callJoinUrl(call.location)
  const subject = `Call scheduled: ${call.title}`

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;color:#5b6b66;font-size:13px;width:96px;vertical-align:top;">${esc(label)}</td>
      <td style="padding:6px 0;color:${INK};font-size:14px;font-weight:600;">${esc(value)}</td>
    </tr>`

  const locationRow = call.location
    ? join
      ? detailRow('Where', 'Online')
      : detailRow('Where', call.location)
    : ''

  const buttons: string[] = []
  if (join) {
    buttons.push(
      `<a href="${esc(join)}" style="display:inline-block;background:${SPROUT};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px;">Join call</a>`,
    )
  }
  if (link) {
    buttons.push(
      `<a href="${esc(link)}" style="display:inline-block;background:#ffffff;color:${INK};text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px;border:1px solid rgba(14,47,39,0.18);">View details</a>`,
    )
  }

  const buttonBlock = buttons.length
    ? `
      <tr>
        <td style="padding:6px 32px 24px;">
          ${buttons.join('\n          ')}
          ${icsAttached ? `<p style="margin:14px 0 0;color:#5b6b66;font-size:13px;">A calendar invite is attached — add it to lock in the time.</p>` : ''}
        </td>
      </tr>`
    : icsAttached
      ? `
      <tr>
        <td style="padding:0 32px 24px;">
          <p style="margin:0;color:#5b6b66;font-size:13px;">A calendar invite is attached — add it to lock in the time.</p>
        </td>
      </tr>`
      : ''

  const notes = call.notes
    ? `
      <tr>
        <td style="padding:0 32px 24px;">
          <p style="margin:0 0 4px;color:#5b6b66;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Agenda</p>
          <p style="margin:0;color:${INK};font-size:14px;line-height:1.55;white-space:pre-line;">${esc(call.notes)}</p>
        </td>
      </tr>`
    : ''

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:${SOFT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(14,47,39,0.1);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:${INK};padding:20px 32px;">
                <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.01em;">${esc(businessName)}</span>
                <span style="color:rgba(255,255,255,0.6);font-size:12px;float:right;line-height:22px;">WorkSprout</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;">
                <p style="margin:0 0 6px;color:${INK};font-size:16px;">Hi ${esc(firstName)},</p>
                <p style="margin:0;color:#5b6b66;font-size:14px;line-height:1.5;">${esc(businessName)} would like to schedule a call with you.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 4px;">
                <p style="margin:0 0 2px;color:${INK};font-size:17px;font-weight:700;">${esc(call.title)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                  ${detailRow('When', when)}
                  ${detailRow('Duration', `${call.durationMinutes} minutes`)}
                  ${locationRow}
                </table>
              </td>
            </tr>
            <tr><td style="height:16px;"></td></tr>
            ${buttonBlock}
            ${notes}
            <tr>
              <td style="background:${SOFT};padding:20px 32px;border-top:1px solid rgba(14,47,39,0.08);">
                <p style="margin:0;color:#5b6b66;font-size:12px;line-height:1.6;">Sent by ${esc(businessName)}${call.business.email ? ` &middot; ${esc(call.business.email)}` : ''}.</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#9aa8a3;font-size:11px;">Powered by WorkSprout</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    `Hi ${firstName},`,
    '',
    `${businessName} would like to schedule a call with you.`,
    '',
    call.title,
    `When: ${when}`,
    `Duration: ${call.durationMinutes} minutes`,
    call.location ? `Where: ${call.location}` : '',
    call.notes ? `\nAgenda: ${call.notes}` : '',
    join ? `\nJoin: ${join}` : '',
    link ? `Details: ${link}` : '',
    icsAttached ? '\nA calendar invite is attached.' : '',
    '',
    `${businessName}${call.business.email ? ` · ${call.business.email}` : ''}`,
  ]
    .filter((line) => line !== '')
    .join('\n')

  return { subject, html, text }
}
