import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// Combinar clases Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatear moneda hondureña (Lempiras)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Formatear número simple
export function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat('es-HN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

// Formatear fecha
export function formatDate(dateStr: string, fmt = 'dd/MM/yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt, { locale: es })
  } catch {
    return dateStr
  }
}

// Formatear fecha y hora
export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy HH:mm", { locale: es })
  } catch {
    return dateStr
  }
}

// Tiempo relativo
export function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { locale: es, addSuffix: true })
  } catch {
    return dateStr
  }
}

// ============================================================
// LÓGICA DE ISV HONDURAS
// Los precios en MercaSmart son INCLUSIVOS de impuesto
// Fórmula: TaxAmount = Subtotal - (Subtotal / (1 + Rate/100))
// ============================================================

export function calculateTax(subtotal: number, taxRate: number): number {
  if (taxRate === 0) return 0
  return subtotal - subtotal / (1 + taxRate / 100)
}

export function calculateBase(subtotal: number, taxRate: number): number {
  if (taxRate === 0) return subtotal
  return subtotal / (1 + taxRate / 100)
}

export function calculateCartItem(
  price: number,
  quantity: number,
  taxRate: number,
  discount = 0
) {
  const gross = price * quantity
  const subtotal = Math.max(0, gross - discount)
  const taxAmount = calculateTax(subtotal, taxRate)
  return { gross, subtotal, taxAmount }
}

// Calcular totales del carrito
export function calculateCartTotals(items: Array<{
  price: number
  quantity: number
  tax_rate: number
  discount: number
}>) {
  let subtotal = 0
  let taxAmount = 0
  let discountAmount = 0

  for (const item of items) {
    const gross = item.price * item.quantity
    const disc = item.discount || 0
    const lineSub = Math.max(0, gross - disc)
    const lineTax = calculateTax(lineSub, item.tax_rate)

    subtotal += lineSub
    taxAmount += lineTax
    discountAmount += disc
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    total: Math.round(subtotal * 100) / 100,
  }
}

// Calcular cambio
export function calculateChange(cashReceived: number, total: number): number {
  return Math.max(0, cashReceived - total)
}

// ============================================================
// NÚMERO DE FACTURA SAR
// Formato: 000-001-01-XXXXXXXX
// ============================================================

export function parseInvoiceNumber(invoiceNumber: string): {
  prefix: string
  sequence: number
} {
  const parts = invoiceNumber.split('-')
  if (parts.length !== 4) return { prefix: invoiceNumber, sequence: 0 }
  const sequence = parseInt(parts[3], 10)
  const prefix = parts.slice(0, 3).join('-')
  return { prefix, sequence }
}

export function formatInvoiceNumber(prefix: string, sequence: number): string {
  return `${prefix}-${sequence.toString().padStart(8, '0')}`
}

// ============================================================
// UTILIDADES VARIAS
// ============================================================

// Generar código de producto
export function generateProductCode(id: number): string {
  return `PRD${id.toString().padStart(6, '0')}`
}

// Truncar texto
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Capitalizar primera letra
export function capitalize(text: string): string {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

// Debounce
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return function (...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Obtener iniciales
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('')
}

// Formatear % de ganancia
export function calculateMargin(costPrice: number, salePrice: number): number {
  if (costPrice === 0) return 0
  return ((salePrice - costPrice) / costPrice) * 100
}

// Obtener URL pública completa de avatar
export function getAvatarUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath || typeof urlOrPath !== 'string' || urlOrPath.trim() === '') return null
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath
  }
  return `https://dyfwcubkvgcqufpmtgvh.supabase.co/storage/v1/object/public/avatars/${urlOrPath.replace(/^\/+/, '')}`
}

