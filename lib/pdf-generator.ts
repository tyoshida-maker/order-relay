'use client'

export type DocType = 'order' | 'delivery' | 'provisional_delivery'

export interface PdfOrderItem {
  id: string
  quantity: number
  unit_price: number | null
  amount: number | null
  notes: string | null
  sort_order: number
  products: { name: string; code: string; category: string } | null
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
  address?: string
  phone?: string
}

export interface GenerateOrderPdfOptions {
  type: DocType
  orderNo: string
  orderDate: string
  deliveryDate: string
  toCompany: PdfCompany
  fromCompany: PdfCompany
  items: {
    name: string
    code: string
    category: string
    quantity: number
    unit_price: number
    amount: number
  }[]
}

export function generateOrderPdf(opts: GenerateOrderPdfOptions): void {
  const titles: Record<DocType, string> = {
    order: '発注書',
    delivery: '納品書',
    provisional_delivery: '他屋倉納品書',
  }
  const title = titles[opts.type]
  const yen = '¥'
  const fmt = (n: number) => n.toLocaleString()
  const total = opts.items.reduce((s, i) => s + i.amount, 0)

  const rows = opts.items.map(item => {
    return '<tr>' +
      '<td>' + item.name + '</td>' +
      '<td style="text-align:right">' + fmt(item.quantity) + '</td>' +
      '<td>' + item.category + '</td>' +
      '<td style="text-align:right">' + yen + fmt(item.unit_price) + '</td>' +
      '<td style="text-align:right">' + yen + fmt(item.amount) + '</td>' +
      '</tr>'
  }).join('')

  const html = [
    '<!DOCTYPE html>',
    '<html lang="ja">',
    '<head>',
    '<meta charset="UTF-8">',
    '<title>' + title + '</title>',
    '<style>',
    'body { font-family: sans-serif; font-size: 10pt; margin: 20px }',
    'table { width: 100%; border-collapse: collapse }',
    'th, td { border: 1px solid #ccc; padding: 4px 8px }',
    'th { background: #eee }',
    '.header { display: flex; justify-content: space-between; margin-bottom: 16px }',
    '.title { font-size: 20pt; font-weight: bold; text-align: center; margin-bottom: 12px }',
    '.total { text-align: right; font-weight: bold; margin-top: 8px }',
    '</style>',
    '</head>',
    '<body>',
    '<div class="title">' + title + '</div>',
    '<div class="header">',
    '<div><div>宛先: <strong>' + opts.toCompany.name + '</strong></div></div>',
    '<div>',
    '<div>発注番号: <strong>' + opts.orderNo + '</strong></div>',
    '<div>発注日: ' + opts.orderDate.replace(/-/g, '/') + '</div>',
    '<div>納品希望日: ' + (opts.deliveryDate ? opts.deliveryDate.replace(/-/g, '/') : '-') + '</div>',
    '<div>発行: ' + opts.fromCompany.name + '</div>',
    '</div>',
    '</div>',
    '<table>',
    '<thead><tr>',
    '<th>商品名</th>',
    '<th>数量</th>',
    '<th>単位</th>',
    '<th>単価</th>',
    '<th>金額</th>',
    '</tr></thead>',
    '<tbody>' + rows + '</tbody>',
    '</table>',
    '<div class="total">合計: ' + yen + fmt(total) + '</div>',
    '</body></html>',
  ].join('')

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

export function openPrintWindow(htmlContent: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

export function buildOrderHtml(
  order: PdfOrder,
  fromCompany: PdfCompany,
  toCompany: PdfCompany,
  docType: DocType,
): string {
  const titles: Record<DocType, string> = {
    order: '発注書',
    delivery: '納品書',
    provisional_delivery: '他屋倉納品書',
  }
  const title = titles[docType]
  const isOrder = docType === 'order'
  const billedTo = isOrder ? toCompany : fromCompany
  const billedFrom = isOrder ? fromCompany : toCompany
  const items = [...order.order_items].sort((a, b) => a.sort_order - b.sort_order)
  const total = items.reduce((s, i) => s + (i.amount || 0), 0)
  const fmt = (n: number | null) => n != null ? n.toLocaleString() : '-'
  const fmtD = (s: string | null) => s ? s.replace(/-/g, '/') : '-'
  const yen = '¥'

  const rows = items.map((item) => {
    const cells = [
      item.products ? item.products.name : '-',
      fmt(item.quantity),
      item.products ? (item.products.category || '') : '',
      item.unit_price ? yen + fmt(item.unit_price) : '-',
      item.amount ? yen + fmt(item.amount) : (item.unit_price && item.quantity ? yen + fmt(item.unit_price * item.quantity) : '-'),
    ]
    return '<tr>' + cells.map(c => '<td>' + c + '</td>').join('') + '</tr>'
  }).join('')

  const toName = billedTo ? billedTo.name : ''
  const toAddr = billedTo?.address || ''
  const fromName = billedFrom ? billedFrom.name : ''
  const fromPhone = billedFrom?.phone || ''

  const parts = [
    '<!DOCTYPE html>',
    '<html lang="ja">',
    '<head>',
    '<meta charset="UTF-8">',
    '<title>' + title + '</title>',
    '<style>body{font-family:sans-serif;font-size:10pt;margin:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:4px 8px} th{background:#eee} .header{display:flex;justify-content:space-between;margin-bottom:16px} .title{font-size:20pt;font-weight:bold;text-align:center;margin-bottom:12px} .total{text-align:right;font-weight:bold;margin-top:8px}</style>',
    '</head>',
    '<body>',
    '<div class="title">' + title + '</div>',
    '<div class="header">',
    '<div><div>宛先: <strong>' + toName + '</strong></div><div>' + toAddr + '</div></div>',
    '<div><div>発注番号: <strong>' + order.order_no + '</strong></div><div>発注日: ' + fmtD(order.order_date) + '</div><div>納品希望日: ' + fmtD(order.delivery_date) + '</div><div>発行: ' + fromName + ' ' + fromPhone + '</div></div>',
    '</div>',
    '<table>',
    '<thead><tr><th>商品名</th><th>数量</th><th>単位</th><th>単価</th><th>金額</th></tr></thead>',
    '<tbody>' + rows + '</tbody>',
    '</table>',
    '<div class="total">合計: ' + yen + fmt(total) + '</div>',
    '</body></html>',
  ]
  return parts.join('')
}