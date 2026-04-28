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

export interface PdfCompany {
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
    const cols = [
      item.products?.name || '-',
      fmt(item.quantity),
      item.products?.unit || '',
      item.unit_price ? yen + fmt(item.unit_price) : '-',
      item.amount ? yen + fmt(item.amount) : '-',
    ]
    return '<tr>' + cols.map(c => '<td>' + c + '</td>').join('') + '</tr>'
  }).join('')

  const parts = [
    '<!DOCTYPE html>',
    '<html lang="ja">',
    '<head>',
    '<meta charset="UTF-8">',
    '<title>' + title + '</title>',
    '<style>',
    'body{font-family:sans-serif;font-size:10pt;margin:20px}',
    'h1{font-size:16pt;text-align:center;border-bottom:2px solid #1d4ed8;padding-bottom:6px}',
    '.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}',
    '.box{border:1px solid #ccc;padding:8px;border-radius:4px}',
    '.lbl{font-size:8pt;color:#555}',
    '.nm{font-size:12pt;font-weight:bold}',
    '.meta{background:#f5f5f5;padding:8px;margin-bottom:12px;font-size:9pt}',
    'table{width:100%;border-collapse:collapse}',
    'thead tr{background:#1d4ed8;color:#fff}',
    'th,td{padding:4px 6px;font-size:9pt;border-bottom:1px solid #eee}',
    '.tot{text-align:right;font-size:12pt;font-weight:bold;margin-top:8px;border-top:2px solid #333;padding-top:4px}',
    '</style>',
    '</head>',
    '<body>',
    '<h1>' + title + '</h1>',
    '<div class="grid">',
    '<div class="box"><div class="lbl">To</div><div class="nm">' + (billedTo?.name || '') + '</div>' + (billedTo?.phone ? '<div>TEL: ' + billedTo.phone + '</div>' : '') + '</div>',
    '<div class="box"><div class="lbl">From</div><div class="nm">' + (billedFrom?.name || '') + '</div>' + (billedFrom?.phone ? '<div>TEL: ' + billedFrom.phone + '</div>' : '') + '</div>',
    '</div>',
    '<div class="meta">Order: <b>' + order.order_no + '</b> | Date: ' + fmtD(order.order_date) + ' | Delivery: ' + fmtD(order.delivery_date) + '</div>',
    '<table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Price</th><th>Amount</th></tr></thead>',
    '<tbody>' + rows + '</tbody></table>',
    '<div class="tot">Total: ' + yen + fmt(total) + '</div>',
    '</body></html>',
  ]
  return parts.join('')
}
