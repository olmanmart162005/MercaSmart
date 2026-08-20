// ============================================================
// TIPOS GLOBALES DE MERCASMART WEB — ARQUITECTURA MULTI-SUCURSAL
// ============================================================

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'cashier'
  | 'Admin'
  | 'Cajero'
  | 'Empleado'

export interface Branch {
  id: string
  code: string
  name: string
  address: string
  phone: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Profile {
  id: string
  username: string
  full_name: string
  role: UserRole
  branch_id?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Relation
  branch?: Branch
}

export interface Category {
  id: number
  name: string
  is_active: boolean
  branch_id?: string | null
  created_at: string
}

export interface Brand {
  id: number
  name: string
  is_active: boolean
  created_at: string
}

export interface Supplier {
  id: number
  name: string
  rtn: string
  phone: string
  address: string
  promotor: string
  promotor_phone: string
  is_active: boolean
  branch_id?: string | null
  created_at: string
}

export interface Product {
  id: number
  code: string
  barcode: string
  name: string
  cost_price: number
  sale_price: number
  tax_rate: number // 0, 15, 18%
  stock: number
  min_stock: number
  category_id: number | null
  brand_id: number | null
  supplier_id: number | null
  branch_id?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  category?: Category
  brand?: Brand
  supplier?: Supplier
  branch?: Branch
}

export interface Customer {
  id: number
  name: string
  rtn: string
  phone: string
  address: string
  debt: number
  branch_id?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CashSessionStatus = 'open' | 'closed'
export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Crédito'

export interface CashSession {
  id: number
  user_id: string
  branch_id?: string | null
  opened_at: string
  closed_at: string | null
  initial_amount: number
  expected_amount: number
  counted_amount: number | null
  difference: number | null
  total_sales: number
  total_cash: number
  total_card: number
  total_transfer: number
  total_income: number
  total_expense: number
  sales_count: number
  status: CashSessionStatus
  notes: string
  created_at: string
  // Relations
  profile?: Profile
  branch?: Branch
}

export interface CashMovement {
  id: number
  session_id: number
  type: 'income' | 'expense'
  amount: number
  description: string
  created_by: string | null
  branch_id?: string | null
  created_at: string
}

export interface Sale {
  id: number
  invoice_number: string
  created_at: string
  user_id: string
  customer_id: number | null
  cash_session_id: number | null
  branch_id?: string | null
  subtotal: number
  tax_amount: number
  discount_amount: number
  total: number
  payment_method: PaymentMethod
  cash_received: number
  change_given: number
  is_cancelled: boolean
  customer_name: string
  customer_rtn: string
  // Relations
  profile?: Profile
  customer?: Customer
  items?: SaleItem[]
  branch?: Branch
}

export interface SaleItem {
  id: number
  sale_id: number
  product_id: number
  quantity: number
  price: number
  tax_rate: number
  subtotal: number
  discount: number
  branch_id?: string | null
  // Relations
  product?: Product
}

export type InventoryType = 'Entrada' | 'Salida' | 'Venta' | 'Ajuste' | 'Devolución'

export interface InventoryTransaction {
  id: number
  product_id: number
  quantity: number
  type: InventoryType
  remarks: string
  user_id: string | null
  reference_id: number | null
  branch_id?: string | null
  created_at: string
  // Relations
  product?: Product
  profile?: Profile
}

export interface Configuration {
  key: string
  value: string
  branch_id?: string | null
  updated_at: string
}

// Cart Item for POS
export interface CartItem {
  product: Product
  quantity: number
  discount: number
  subtotal: number
  tax_amount: number
}
