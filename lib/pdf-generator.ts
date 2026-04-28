'use client'

export type DocType = 'order' | 'delivery' | 'provisional_delivery'

export interface PdfOrderItem {
  id: string
  quantity: number
  unit_price: number | null
  amount: number | null
  notes: string | null
  sort_order: number
  products: { name: string; code: string; unit: string } | null
}

export interface PdfOrder {
  id: string
  order_no: string
  order_date: string
  delivery_date: string | null
  notes: string | null
  order_items: PdfOrderItem[]
}

export type PdfCompany = {
  name: string
  address?: string | null
  phone?: string | null
  fax?: string | null
  email?: string | null
} | null

export function openPrintWindow(htmlContent: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) {
    win.onload = () => {
      setTimeout(() => { win.print() }, 500)
    }
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export function buildOrderHtml(
  order: PdfOrder,
  fromCompany: PdfCompany,
  toCompany: PdfCompany,
  docType: DocType,
): string {
  const titles: Record<DocType, string> = {
    order: 'Order (Hacchu-sho)',
    delivery: 'Delivery (Nouhin-sho)',
    provisional_delivery: 'Provisional Delivery',
  }
  const title = titles[docType]
  const isOrder = docType === 'order'
  const billedTo = isOrder ? toCompany : fromCompany
  const billedFrom = isOrder ? fromCompany : toCompany
  const items = [...order.order_items].sort((a, b) => a.sort_order - b.sort_order)
  const total = items.reduce((s, i) => s + (i.amount || 0), 0)
  const fmt = (n: number | null) => n != null ? n.toLocaleString() : '-'
  const fmtD = (s: string | null) => s ? s.replace(/-/g, '/') : '-'
  const yen = '\u00a5'

  const rows = items.map((item) => {
    const cells = [
      item.products ? item.products.name : '-',
      fmt(item.quantity),
      item.products ? item.products.unit : '',
      item.unit_price ? yen + fmt(item.unit_price) : '-',
      item.amount ? yen + fmt(item.amount) : '-',
    ]
    return '<tr>' + cells.map(c => '<td>' + c + '</td>').join('') + '</tr>'
  }).join('')

  const toName = billedTo ? billedTo.name : ''
  const toPhone = billedTo && billedTo.phone ? billedTo.phone : ''
  const fromName = billedFrom ? billedFrom.name : ''
  const fromPhone = billedFrom && billedFrom.phone ? billedFrom.phone : ''

  const parts = [
    '<!DOCTYPE html>',
    '<html lang="ja">',
    '<head>',
    '<meta charset="UTF-8">',
    '<title>' + title + '</title>',
    '<style>body{font-family:sans-serif;font-size:10pt;margin:20px}</style>',
    '</head>',
    '<body>',
    '<h1 style="text-align:center;border-bottom:2px solid #1d4ed8;padding-bottom:6px">' + title + '</h1>',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0">',
    '<div style="border:1px solid #ccc;padding:8px"><div style="font-size:8pt">To</div><div style="font-size:12pt;font-weight:bold">' + toName + '</div>' + (toPhone ? '<div>TEL: ' + toPhone + '</div>' : '') + '</div>',
    '<div style="border:1px solid #ccc;padding:8px"><div style="font-size:8pt">From</div><div style="font-size:12pt;font-weight:bold">' + fromName + '</div>' + (fromPhone ? '<div>TEL: ' + fromPhone + '</div>' : '') + '</div>',
    '</div>',
    '<div style="background:#f5f5f5;padding:8px;margin-bottom:12px;font-size:9pt">Order: <b>' + order.order_no + '</b> Date: ' + fmtD(order.order_date) + ' Delivery: ' + fmtD(order.delivery_date) + '</div>',
    '<table style="width:100%;border-collapse:collapse">',
    '<thead><tr style="background:#1d4ed8;color:#fff"><th>Item</th><th>Qty</th><th>Unit</th><th>Price</th><th>Amount</th></tr></thead>',
    '<tbody>' + rows + '</tbody>',
    '</table>',
    '<div style="text-align:right;font-size:12pt;font-weight:bold;margin-top:8px;border-top:2px solid #333;padding-top:4px">Total: ' + yen + fmt(total) + '</div>',
    '</body></html>',
  ]
  return parts.join('')
}