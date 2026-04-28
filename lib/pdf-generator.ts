'use client'

type OrderItemForPdf = {
  id: string
  quantity: number
  unit_price: number | null
  amount: number | null
  notes: string | null
  sort_order: number
  products: { name: string; code: string; unit: string } | null
}

type OrderForPdf = {
  id: string
  order_no: string
  order_date: string
  delivery_date: string | null
  notes: string | null
  order_items: OrderItemForPdf[]
}

type CompanyForPdf = {
  name: string
  address?: string | null
  phone?: string | null
  fax?: string | null
  email?: string | null
} | null

const DOC_TITLES: Record<string, string> = {
  order: 'Order (Hacchu-sho)',
  delivery: 'Delivery (Nouhin-sho)',
  provisional_delivery: 'Provisional Delivery',
}

const fmtNum = (n: number | null) => n != null ? n.toLocaleString() : '-'
const fmtDate = (s: string | null) => s ? s.replace(/-/g, '/') : '-'

export async function generateOrderPdf({ order, fromCompany, toCompany, docType }: {
  order: OrderForPdf
  fromCompany: CompanyForPdf
  toCompany: CompanyForPdf
  docType: 'order' | 'delivery' | 'provisional_delivery'
  allCompanies: unknown[]
}): Promise<Uint8Array> {
  const title = DOC_TITLES[docType] || 'Document'
  const isOrder = docType === 'order'
  const billedTo = isOrder ? toCompany : fromCompany
  const billedFrom = isOrder ? fromCompany : toCompany
  const items = [...order.order_items].sort((a, b) => a.sort_order - b.sort_order)
  const total = items.reduce((s, i) => s + (i.amount || 0), 0)

  const rows = items.map(item => [
    '<tr>',
    '<td>' + (item.products?.name || '-') + '</td>',
    '<td style="text-align:right">' + fmtNum(item.quantity) + '</td>',
    '<td style="text-align:center">' + (item.products?.unit || '') + '</td>',
    '<td style="text-align:right">' + (item.unit_price ? '\u00a5' + fmtNum(item.unit_price) : '-') + '</td>',
    '<td style="text-align:right">' + (item.amount ? '\u00a5' + fmtNum(item.amount) : '-') + '</td>',
    '</tr>',
  ].join('')).join('')

  const html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>' + title + '</title><style>
    @page{margin:15mm;size:A4 portrait;}
    body{font-family:Hiragino Sans,Yu Gothic,Meiryo,sans-serif;font-size:10pt;margin:0;color:#111}
    h1{font-size:18pt;text-align:center;border-bottom:2px solid #1d4ed8;padding-bottom:8px;margin-bottom:16px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
    .box{border:1px solid #e5e7eb;border-radius:4px;padding:8px}
    .lbl{font-size:8pt;color:#555;margin-bottom:3px}
    .nm{font-size:13pt;font-weight:bold}
    .meta{background:#f8fafc;border:1px solid #d1d5db;border-radius:4px;padding:8px 10px;margin-bottom:12px;font-size:9pt;display:flex;gap:20px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    thead tr{background:#1d4ed8;color:white}
    th,td{padding:5px 4px;font-size:9pt}
    tbody tr:nth-child(even){background:#f9fafb}
    tbody tr{border-bottom:.5px solid #e5e7eb}
    .total{border-top:1.5px solid #333;padding:6px 4px;text-align:right;font-size:12pt;font-weight:bold;margin-top:4px}
  </style></head><body>
  <h1>' + title + '</h1>
  <div class="grid">
    <div class="box"><div class="lbl">' + (isOrder ? 'To:' : 'Deliver To:') + '</div><div class="nm">' + (billedTo?.name || '') + '</div>' + (billedTo?.address ? '<div style="font-size:8pt;color:#666">' + billedTo.address + '</div>' : '') + (billedTo?.phone ? '<div style="font-size:8pt">TEL: ' + billedTo.phone + '</div>' : '') + '</div>',
    '<div class="box"><div class="lbl">' + (isOrder ? 'From:' : 'Issued By:') + '</div><div class="nm">' + (billedFrom?.name || '') + '</div>' + (billedFrom?.address ? '<div style="font-size:8pt;color:#666">' + billedFrom.address + '</div>' : '') + (billedFrom?.phone ? '<div style="font-size:8pt">TEL: ' + billedFrom.phone + '</div>' : '') + '</div>',
  '</div>',
  '<div class="meta"><span>Order No: <b>' + order.order_no + '</b></span><span>Date: ' + fmtDate(order.order_date) + '</span><span>Delivery: ' + fmtDate(order.delivery_date) + '</span></div>',
  '<table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr></thead><tbody>' + rows + '</tbody></table>',
  '<div class="total">Total: \u00a5' + fmtNum(total) + '</div>',
  '</body></html>'

  const encoder = new TextEncoder()
  return encoder.encode(html)
}

export function downloadHtmlAsPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'text/html; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) {
    win.onload = () => { setTimeout(() => { win.print() }, 500) }
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}