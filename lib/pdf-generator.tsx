'use client'
import React from 'react'
import { pdf, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

try {
  Font.register({
    family: 'Helvetica',
    fonts: []
  })
} catch (e) {
  // ignore font registration errors
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#111' },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, borderBottom: '2px solid #1d4ed8', paddingBottom: 8 },
  infoGrid: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  infoBox: { flex: 1, border: '1px solid #e5e7eb', borderRadius: 4, padding: '6 8' },
  companyBox: { border: '1px solid #d1d5db', borderRadius: 4, padding: '8 10', marginBottom: 12, backgroundColor: '#f8fafc' },
  table: { marginTop: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1d4ed8', color: 'white', padding: '5 4', fontSize: 9 },
  tableRow: { flexDirection: 'row', borderBottom: '0.5px solid #e5e7eb', padding: '4 4', fontSize: 9 },
  tableRowAlt: { flexDirection: 'row', borderBottom: '0.5px solid #e5e7eb', padding: '4 4', fontSize: 9, backgroundColor: '#f9fafb' },
  col1: { flex: 3 },
  col2: { width: 50, textAlign: 'right' },
  col3: { width: 30, textAlign: 'center' },
  col4: { width: 65, textAlign: 'right' },
  col5: { width: 70, textAlign: 'right' },
  totalRow: { flexDirection: 'row', borderTop: '1.5px solid #333', padding: '6 4', marginTop: 2 },
  totalLabel: { flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: 11 },
  totalValue: { width: 70, textAlign: 'right', fontWeight: 'bold', fontSize: 13, color: '#1d4ed8' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTop: '1px solid #e5e7eb', paddingTop: 6, fontSize: 8, color: '#888', textAlign: 'center' },
})

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
  contact_person?: string | null
} | null

const DOC_TITLES: Record<string, string> = {
  order: '\u767a \u6ce8 \u66f8',
  delivery: '\u7d0d \u54c1 \u66f8',
  provisional_delivery: '\u4ed \u7d0d \u54c1 \u66f8',
}

const fmtNum = (n: number | null) => n != null ? n.toLocaleString() : '-'
const fmtDate = (s: string | null) => s ? s.replace(/-/g, '/') : '-'

type DocProps = {
  order: OrderForPdf
  fromCompany: CompanyForPdf
  toCompany: CompanyForPdf
  docType: 'order' | 'delivery' | 'provisional_delivery'
}

function OrderDocument({ order, fromCompany, toCompany, docType }: DocProps) {
  const items = order.order_items.sort((a, b) => a.sort_order - b.sort_order)
  const total = items.reduce((s, i) => s + (i.amount || 0), 0)
  const title = DOC_TITLES[docType] || 'Document'
  const isOrder = docType === 'order'
  const billedTo = isOrder ? toCompany : fromCompany
  const billedFrom = isOrder ? fromCompany : toCompany

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={{ fontSize: 9, color: '#555', marginBottom: 2 }}>{isOrder ? 'To:' : 'Deliver To:'}</Text>
            <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{billedTo?.name || ' '}</Text>
            {billedTo?.address ? <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{billedTo.address}</Text> : null}
            {billedTo?.phone ? <Text style={{ fontSize: 8, color: '#666' }}>TEL: {billedTo.phone}</Text> : null}
          </View>
          <View style={styles.infoBox}>
            <Text style={{ fontSize: 9, color: '#555', marginBottom: 2 }}>{isOrder ? 'From:' : 'Issued By:'}</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{billedFrom?.name || ' '}</Text>
            {billedFrom?.address ? <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{billedFrom.address}</Text> : null}
            {billedFrom?.phone ? <Text style={{ fontSize: 8, color: '#666' }}>TEL: {billedFrom.phone}</Text> : null}
            {billedFrom?.email ? <Text style={{ fontSize: 8, color: '#666' }}>Email: {billedFrom.email}</Text> : null}
          </View>
        </View>
        <View style={styles.companyBox}>
          <View style={{ flexDirection: 'row', gap: 30 }}>
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ fontSize: 9, color: '#555', width: 70 }}>Order No:</Text>
              <Text style={{ fontWeight: 'bold' }}>{order.order_no}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ fontSize: 9, color: '#555', width: 55 }}>Date:</Text>
              <Text>{fmtDate(order.order_date)}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ fontSize: 9, color: '#555', width: 70 }}>Delivery:</Text>
              <Text>{fmtDate(order.delivery_date)}</Text>
            </View>
          </View>
          {order.notes ? (
            <View style={{ marginTop: 4, flexDirection: 'row' }}>
              <Text style={{ fontSize: 9, color: '#555', width: 35 }}>Note:</Text>
              <Text>{order.notes}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Item</Text>
            <Text style={styles.col2}>Qty</Text>
            <Text style={styles.col3}>Unit</Text>
            <Text style={styles.col4}>Price</Text>
            <Text style={styles.col5}>Amount</Text>
          </View>
          {items.map((item, i) => (
            <View key={item.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.col1}>{item.products?.name || '-'}</Text>
              <Text style={styles.col2}>{fmtNum(item.quantity)}</Text>
              <Text style={styles.col3}>{item.products?.unit || ''}</Text>
              <Text style={styles.col4}>{item.unit_price ? 'Y' + fmtNum(item.unit_price) : '-'}</Text>
              <Text style={styles.col5}>{item.amount ? 'Y' + fmtNum(item.amount) : '-'}</Text>
            </View>
          ))}
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>Y{fmtNum(total)}</Text>
        </View>
        <View style={styles.footer}>
          <Text>Order Relay - {order.order_no} - {fmtDate(order.order_date)}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateOrderPdf({
  order,
  fromCompany,
  toCompany,
  docType,
}: {
  order: OrderForPdf
  fromCompany: CompanyForPdf
  toCompany: CompanyForPdf
  docType: 'order' | 'delivery' | 'provisional_delivery'
  allCompanies: unknown[]
}): Promise<Uint8Array> {
  const pdfInstance = pdf(
    <OrderDocument
      order={order}
      fromCompany={fromCompany}
      toCompany={toCompany}
      docType={docType}
    />
  )
  const blob = await pdfInstance.toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}
