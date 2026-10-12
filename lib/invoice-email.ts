// Branded transactional email for an invoice. Table-based, inline styles, so it
// renders consistently across mail clients (which strip <style> and flexbox).

import type { InvoiceSnapshot } from '@/lib/invoice'
import { taxLines } from '@/lib/tax'
import { formatDate, formatPercent, peso } from '@/lib/format'

const INK = '#0E2F27'
const SPROUT = '#2E9E6B'
const SPROUT_DARK = '#1F6B52'
const SOFT = '#F4F8F5'

function esc(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type InvoiceEmail = { subject: string; html: string; text: string }

export function renderInvoiceEmail(
  inv: InvoiceSnapshot,
  link: string | null,
  pdfAttached: boolean,
): InvoiceEmail {
  const businessName = inv.business.name
  const firstName = (inv.client?.name ?? '').trim().split(/\s+/)[0] || 'there'
  const amountDue = inv.balance > 0 ? inv.balance : inv.total
  const dueLine = inv.dueDate ? `Due ${formatDate(inv.dueDate)}` : 'Due on receipt'
  const subject = `Invoice ${inv.number} from ${businessName}`

  const rows = inv.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid rgba(14,47,39,0.08);color:${INK};font-size:14px;">${esc(item.description)}</td>
          <td style="padding:8px 0;border-bottom:1px solid rgba(14,47,39,0.08);color:${INK};font-size:14px;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;">${esc(peso(item.amount))}</td>
        </tr>`,
    )
    .join('')

  const taxRows = taxLines(inv.subtotal, inv.taxes)
    .map(
      (tax) => `
        <tr>
          <td style="padding:2px 0;color:#5b6b66;font-size:13px;">${esc(tax.label)} (${esc(formatPercent(tax.rate))})</td>
          <td style="padding:2px 0;color:#5b6b66;font-size:13px;text-align:right;font-variant-numeric:tabular-nums;">${esc(peso(tax.amount))}</td>
        </tr>`,
    )
    .join('')

  const paidRows =
    inv.amountPaid > 0
      ? `
        <tr>
          <td style="padding:2px 0;color:${SPROUT_DARK};font-size:13px;">Amount paid</td>
          <td style="padding:2px 0;color:${SPROUT_DARK};font-size:13px;text-align:right;font-variant-numeric:tabular-nums;">&minus;${esc(peso(inv.amountPaid))}</td>
        </tr>`
      : ''

  const button = link
    ? `
      <tr>
        <td style="padding:4px 32px 28px;">
          <a href="${esc(link)}" style="display:inline-block;background:${SPROUT};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px;">View invoice</a>
          ${pdfAttached ? `<p style="margin:14px 0 0;color:#5b6b66;font-size:13px;">A PDF copy is attached to this email.</p>` : ''}
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
                <p style="margin:0;color:#5b6b66;font-size:14px;line-height:1.5;">${esc(businessName)} has sent you invoice <strong style="color:${INK};">${esc(inv.number)}</strong> for <strong style="color:${INK};">${esc(peso(amountDue))}</strong>, ${esc(dueLine.toLowerCase())}.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:10px;border-bottom:1px solid rgba(14,47,39,0.12);color:#5b6b66;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Description</td>
                    <td style="padding-bottom:10px;border-bottom:1px solid rgba(14,47,39,0.12);color:#5b6b66;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;text-align:right;">Amount</td>
                  </tr>
                  ${rows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 4px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:2px 0;color:#5b6b66;font-size:13px;">Subtotal</td>
                    <td style="padding:2px 0;color:#5b6b66;font-size:13px;text-align:right;font-variant-numeric:tabular-nums;">${esc(peso(inv.subtotal))}</td>
                  </tr>
                  ${taxRows}
                  <tr>
                    <td style="padding:10px 0 2px;border-top:1px solid rgba(14,47,39,0.12);color:${INK};font-size:15px;font-weight:700;">Total</td>
                    <td style="padding:10px 0 2px;border-top:1px solid rgba(14,47,39,0.12);color:${INK};font-size:15px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums;">${esc(peso(inv.total))}</td>
                  </tr>
                  ${paidRows}
                </table>
              </td>
            </tr>
            ${button}
            <tr>
              <td style="background:${SOFT};padding:20px 32px;border-top:1px solid rgba(14,47,39,0.08);">
                <p style="margin:0;color:#5b6b66;font-size:12px;line-height:1.6;">Sent by ${esc(businessName)}${inv.business.email ? ` &middot; ${esc(inv.business.email)}` : ''}.</p>
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
    `${businessName} has sent you invoice ${inv.number} for ${peso(amountDue)}. ${dueLine}.`,
    link ? `View it online: ${link}` : '',
    pdfAttached ? 'A PDF copy is attached.' : '',
    '',
    `${businessName}${inv.business.email ? ` · ${inv.business.email}` : ''}`,
  ]
    .filter((line) => line !== '')
    .join('\n')

  return { subject, html, text }
}
