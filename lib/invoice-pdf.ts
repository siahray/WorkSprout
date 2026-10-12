// Renders an invoice to a PDF with pdf-lib (pure JS, no native deps). Layout is
// drawn by hand so we stay dependency-light and serverless-safe.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { InvoiceSnapshot } from '@/lib/invoice'
import { taxLines } from '@/lib/tax'
import { formatDate, formatPercent } from '@/lib/format'

const A4: [number, number] = [595.28, 841.89]
const MARGIN = 48
const WIDTH = A4[0]
const HEIGHT = A4[1]
const CONTENT_RIGHT = WIDTH - MARGIN

const INK = rgb(0.055, 0.184, 0.153)
const SPROUT = rgb(0.18, 0.62, 0.42)
const MUTED = rgb(0.42, 0.46, 0.45)
const LINE = rgb(0.86, 0.89, 0.88)

const moneyFmt = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const qtyFmt = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 })

function money(value: number): string {
  return `PHP ${moneyFmt.format(Number(value) || 0)}`
}

// pdf-lib's built-in fonts are WinAnsi; normalise punctuation it cannot encode
// and swap the peso sign for its code so no text renders as a blank box.
const REPLACEMENTS: [RegExp, string][] = [
  [/\u20b1/g, 'PHP '],
  [/[\u2018\u2019\u201a\u201b]/g, "'"],
  [/[\u201c\u201d\u201e\u201f]/g, '"'],
  [/[\u2013\u2014]/g, '-'],
  [/\u2022/g, '-'],
  [/\u2026/g, '...'],
]

function sanitize(input: string): string {
  let out = String(input ?? '')
  for (const [pattern, value] of REPLACEMENTS) out = out.replace(pattern, value)
  // Drop C1/control and anything outside Latin-1 that WinAnsi can't represent.
  return out.replace(/[^\x20-\x7e\xa0-\xff]/g, '').replace(/[ \t]+/g, ' ').trim()
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export async function buildInvoicePdf(inv: InvoiceSnapshot): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Invoice ${inv.number}`)
  doc.setAuthor(inv.business.name)
  doc.setSubject(`Invoice ${inv.number}`)
  doc.setProducer('WorkSprout')

  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const drawText = (page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = INK) =>
    page.drawText(sanitize(text), { x, y, size, font, color })

  const drawRight = (page: PDFPage, text: string, rightX: number, y: number, font: PDFFont, size: number, color = INK) => {
    const value = sanitize(text)
    page.drawText(value, { x: rightX - font.widthOfTextAtSize(value, size), y, size, font, color })
  }

  const rule = (page: PDFPage, y: number, color = LINE, thickness = 0.75) =>
    page.drawLine({ start: { x: MARGIN, y }, end: { x: CONTENT_RIGHT, y }, thickness, color })

  const wrap = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
    const words = sanitize(text).split(' ').filter(Boolean)
    if (words.length === 0) return ['']
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate
      else {
        if (current) lines.push(current)
        current = word
      }
    }
    if (current) lines.push(current)
    return lines
  }

  // --- Header -----------------------------------------------------------------
  let page = doc.addPage(A4)
  let y = HEIGHT - MARGIN

  drawText(page, inv.business.name, MARGIN, y - 14, bold, 18, INK)
  drawRight(page, 'INVOICE', CONTENT_RIGHT, y - 12, bold, 20, SPROUT)
  y -= 26

  const leftLines = [inv.business.address, inv.business.phone, inv.business.email].filter(
    (line): line is string => Boolean(line),
  )
  const meta: [string, string][] = [
    ['Invoice', inv.number],
    ['Status', capitalize(inv.status)],
    ['Issued', formatDate(inv.issueDate)],
    ['Due', inv.dueDate ? formatDate(inv.dueDate) : '-'],
  ]

  let leftY = y
  for (const line of leftLines) {
    drawText(page, line, MARGIN, leftY - 10, regular, 9, MUTED)
    leftY -= 12
  }

  let metaY = y
  for (const [label, value] of meta) {
    const valueFont = label === 'Invoice' ? bold : regular
    const valueColor = label === 'Status' ? SPROUT : INK
    drawRight(page, value, CONTENT_RIGHT, metaY - 10, valueFont, 9.5, valueColor)
    const valueWidth = valueFont.widthOfTextAtSize(sanitize(value), 9.5)
    drawRight(page, label, CONTENT_RIGHT - valueWidth - 8, metaY - 10, regular, 9, MUTED)
    metaY -= 13
  }

  y = Math.min(leftY, metaY) - 16
  rule(page, y, LINE, 1)
  y -= 24

  // --- Bill to ----------------------------------------------------------------
  drawText(page, 'BILL TO', MARGIN, y, bold, 8, SPROUT)
  y -= 15
  drawText(page, inv.client?.name ?? '-', MARGIN, y, bold, 11, INK)
  y -= 13
  const clientLines = [
    inv.client?.company,
    inv.client?.address,
    inv.client?.email,
    inv.client?.taxId ? `TIN: ${inv.client.taxId}` : null,
  ].filter((line): line is string => Boolean(line))
  for (const line of clientLines) {
    for (const wrapped of wrap(line, regular, 9, CONTENT_RIGHT - MARGIN)) {
      drawText(page, wrapped, MARGIN, y, regular, 9, MUTED)
      y -= 12
    }
  }

  y -= 12

  // --- Items table ------------------------------------------------------------
  const columns = {
    qty: CONTENT_RIGHT - 200,
    rate: CONTENT_RIGHT - 110,
    amount: CONTENT_RIGHT,
    descWidth: CONTENT_RIGHT - 200 - MARGIN - 16,
  }

  const drawTableHead = () => {
    drawText(page, 'Description', MARGIN, y, bold, 9, MUTED)
    drawRight(page, 'Qty', columns.qty, y, bold, 9, MUTED)
    drawRight(page, 'Rate', columns.rate, y, bold, 9, MUTED)
    drawRight(page, 'Amount', columns.amount, y, bold, 9, MUTED)
    y -= 7
    rule(page, y, INK, 1)
    y -= 6
  }

  drawTableHead()

  for (const item of inv.items) {
    const descLines = wrap(item.description, regular, 10, columns.descWidth)
    const rowHeight = Math.max(20, descLines.length * 13 + 6)

    if (y - rowHeight < 110) {
      page = doc.addPage(A4)
      y = HEIGHT - MARGIN
      drawTableHead()
    }

    let lineY = y - 11
    for (const line of descLines) {
      drawText(page, line, MARGIN, lineY, regular, 10, INK)
      lineY -= 13
    }
    drawRight(page, qtyFmt.format(item.quantity), columns.qty, y - 11, regular, 10, INK)
    drawRight(page, money(item.unitRate), columns.rate, y - 11, regular, 10, INK)
    drawRight(page, money(item.amount), columns.amount, y - 11, regular, 10, INK)

    y -= rowHeight
    rule(page, y, LINE, 0.5)
  }

  // --- Totals -----------------------------------------------------------------
  y -= 16
  const boxLeft = CONTENT_RIGHT - 220

  const row = (
    label: string,
    value: string,
    opts: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb>; gap?: number } = {},
  ) => {
    drawText(page, label, boxLeft, y, regular, opts.size ?? 10, MUTED)
    drawRight(page, value, columns.amount, y, opts.bold ? bold : regular, opts.size ?? 10, opts.color ?? INK)
    y -= opts.gap ?? 15
  }

  row('Subtotal', money(inv.subtotal))
  for (const tax of taxLines(inv.subtotal, inv.taxes)) {
    row(`${tax.label} (${formatPercent(tax.rate)})`, money(tax.amount))
  }

  page.drawLine({ start: { x: boxLeft, y: y + 5 }, end: { x: columns.amount, y: y + 5 }, thickness: 1, color: LINE })
  y -= 3
  row('Total', money(inv.total), { bold: true, size: 12, gap: 16 })
  if (inv.amountPaid > 0) {
    row('Amount paid', money(inv.amountPaid), { color: SPROUT })
    row('Balance due', money(inv.balance), { bold: true, size: 12 })
  }

  // --- Notes ------------------------------------------------------------------
  if (inv.notes) {
    y -= 10
    rule(page, y + 6, LINE, 1)
    drawText(page, 'Notes', MARGIN, y, bold, 9, MUTED)
    y -= 14
    for (const line of wrap(inv.notes, regular, 9.5, CONTENT_RIGHT - MARGIN)) {
      drawText(page, line, MARGIN, y, regular, 9.5, MUTED)
      y -= 12
    }
  }

  // --- Branding bar + footer on every page ------------------------------------
  for (const p of doc.getPages()) {
    p.drawRectangle({ x: 0, y: HEIGHT - 6, width: WIDTH, height: 6, color: SPROUT })
    p.drawLine({ start: { x: MARGIN, y: MARGIN - 8 }, end: { x: CONTENT_RIGHT, y: MARGIN - 8 }, thickness: 0.5, color: LINE })
    drawText(p, `Invoice ${inv.number}`, MARGIN, MARGIN - 18, regular, 8, MUTED)
    drawRight(p, 'Generated by WorkSprout', CONTENT_RIGHT, MARGIN - 18, regular, 8, MUTED)
  }

  return doc.save()
}
