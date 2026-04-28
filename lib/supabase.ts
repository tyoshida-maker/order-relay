import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Company = {
  id: string
  name: string
  short_name: string | null
  postal_code: string | null
  address: string | null
  phone: string | null
  fax: string | null
  email: string | null
  contact_person: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Product = {
  id: string
  code: string
  name: string
  unit: string
  description: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type PriceRule = {
  id: string
  company_id: string
  product_id: string
  unit_price: number
  valid_from: string
  valid_to: string | null
  notes: string | null
  created_at: string
}

export type PdfTemplate = {
  id: string
  name: string
  doc_type: string
  storage_path: string | null
  field_coords: Record<string, { x: number; y: number; fontSize?: number }>
  notes: string | null
  created_at: string
  updated_at: string
}

export type Flow = {
  id: string
  name: string
  steps: Array<{ company_id: string; role: string }>
  doc_sets: Array<{ doc_type: string; from_company_id: string; to_company_id: string; template_id: string }>
  notes: string | null
  created_at: string
  updated_at: string
}

export type Order = {
  id: string
  order_no: string
  order_date: string
  delivery_date: string | null
  flow_id: string | null
  from_company_id: string | null
  notes: string | null
  status: string
  created_at: string
  updated_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  product_id: string | null
  quantity: number
  unit_price: number | null
  amount: number | null
  notes: string | null
  sort_order: number
  created_at: string
}
