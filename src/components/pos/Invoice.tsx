import React from 'react'
import { Printer, Download, X, AlertTriangle } from 'lucide-react'

interface InvoiceProps {
  sale: {
    id: string
    invoice_number: string
    created_at: string
    payment_method: string
    cash_received?: number
    change_given?: number
    subtotal: number
    tax_amount: number
    discount_amount: number
    total: number
    customer_name?: string
    customer_rtn?: string
    is_cancelled?: boolean
  }
  items: Array<{
    product_name?: string
    product?: { name: string; code?: string }
    quantity: number
    price: number
    tax_rate: number
    subtotal: number
    discount?: number
  }>
  branch: {
    name: string
    address?: string
    phone?: string
    rtn?: string
    logo_url?: string
    code?: string
  } | null
  sarConfig?: {
    cai?: string
    rango_inicio?: string
    rango_fin?: string
    fecha_limite?: string
    footer_text?: string
  }
  onClose: () => void
  onCancel?: (saleId: string) => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format a number as Honduran currency: L 1,234.56
 */
function formatLps(value: number): string {
  return `L ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

/**
 * Format a JS Date string into a human-readable date + time pair.
 */
function formatDateTime(isoString: string): { date: string; time: string } {
  const d = new Date(isoString)
  const date = d.toLocaleDateString('es-HN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const time = d.toLocaleTimeString('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
  return { date, time }
}

/**
 * Format invoice_number into the three-part Honduran CAI format.
 * Example output: "001-001-01-00000001"
 * If it already contains at least two dashes it is returned as-is.
 */
function formatInvoiceNumber(raw: string): string {
  if ((raw.match(/-/g) || []).length >= 2) return raw
  const padded = raw.replace(/\D/g, '').padStart(8, '0')
  return `001-001-01-${padded}`
}

/**
 * Translate payment_method codes to Spanish labels.
 */
function translatePaymentMethod(method: string): string {
  const map: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    credit: 'Crédito',
    mixed: 'Mixto',
  }
  return map[method.toLowerCase()] ?? method
}

// ─── Divider ─────────────────────────────────────────────────────────────────

const Divider: React.FC = () => (
  <div className="my-2 border-t border-dashed border-gray-400 print:border-black" />
)

// ─── Main Component ───────────────────────────────────────────────────────────

const Invoice: React.FC<InvoiceProps> = ({
  sale,
  items,
  branch,
  sarConfig,
  onClose,
  onCancel,
}) => {
  const { date, time } = formatDateTime(sale.created_at)
  const invoiceFormatted = formatInvoiceNumber(sale.invoice_number)
  const paymentLabel = translatePaymentMethod(sale.payment_method)
  const isCash =
    sale.payment_method.toLowerCase() === 'cash' ||
    sale.payment_method.toLowerCase() === 'efectivo'

  // ── Print handler ──────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print()
  }

  // ── Download as plain text ─────────────────────────────────────────────────
  const handleDownload = () => {
    const lines: string[] = []
    lines.push(branch?.name ?? 'MercaSmart')
    if (branch?.address) lines.push(branch.address)
    if (branch?.phone) lines.push(`Tel: ${branch.phone}`)
    if (branch?.rtn) lines.push(`RTN: ${branch.rtn}`)
    lines.push('='.repeat(40))
    if (sarConfig?.cai) lines.push(`CAI: ${sarConfig.cai}`)
    lines.push(`Factura No: ${invoiceFormatted}`)
    lines.push(`Fecha: ${date}  Hora: ${time}`)
    lines.push('-'.repeat(40))
    lines.push(`Cliente: ${sale.customer_name ?? 'Consumidor Final'}`)
    lines.push(`RTN: ${sale.customer_rtn ?? 'CF'}`)
    lines.push('-'.repeat(40))
    items.forEach((item) => {
      const name =
        item.product_name ?? item.product?.name ?? '(Producto sin nombre)'
      lines.push(name)
      lines.push(
        `  ${item.quantity} x ${formatLps(item.price)}  =  ${formatLps(item.subtotal)}`
      )
    })
    lines.push('='.repeat(40))
    lines.push(`Subtotal: ${formatLps(sale.subtotal)}`)
    lines.push(`ISV: ${formatLps(sale.tax_amount)}`)
    if (sale.discount_amount > 0)
      lines.push(`Descuento: -${formatLps(sale.discount_amount)}`)
    lines.push(`TOTAL: ${formatLps(sale.total)}`)
    lines.push('-'.repeat(40))
    lines.push(`Método de Pago: ${paymentLabel}`)
    if (isCash && sale.cash_received != null)
      lines.push(`Efectivo Recibido: ${formatLps(sale.cash_received)}`)
    if (isCash && sale.change_given != null)
      lines.push(`Cambio: ${formatLps(sale.change_given)}`)
    lines.push('='.repeat(40))
    lines.push(sarConfig?.footer_text ?? '¡Gracias por su compra!')
    lines.push(
      'Este documento es una representación impresa de la factura electrónica.'
    )

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `factura-${sale.invoice_number}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* ── Print styles injected into document ────────────────────────────── */}
      <style>{`
        @media print {
          /* Hide everything on the page */
          body * {
            visibility: hidden !important;
          }
          /* Show only the invoice area */
          #invoice-print-area,
          #invoice-print-area * {
            visibility: visible !important;
          }
          /* Position it at top-left of the page */
          #invoice-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: #fff !important;
            font-size: 10pt !important;
            color: #000 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          /* Thermal paper page setup */
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>

      {/* ── Modal Overlay ──────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-6 px-4"
        onClick={(e) => {
          // Close when clicking the backdrop (not the invoice itself)
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
          {/* ── Action Toolbar ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between print:hidden">
            <h2 className="text-white font-bold text-base sm:text-lg truncate">
              {sale.is_cancelled ? (
                <span className="text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Factura Anulada
                </span>
              ) : (
                'Factura Fiscal SAR'
              )}
            </h2>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Optional Cancel button */}
              {onCancel && !sale.is_cancelled && (
                <button
                  onClick={() => onCancel(sale.id)}
                  title="Anular factura"
                  className="flex items-center gap-1 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white px-2.5 py-1.5 text-xs font-bold transition-all border border-rose-500/30"
                >
                  <AlertTriangle size={14} />
                  Anular
                </button>
              )}
              {/* Download button */}
              <button
                onClick={handleDownload}
                title="Descargar como texto"
                className="flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 text-xs font-bold transition-colors"
              >
                <Download size={14} />
                Descargar
              </button>
              {/* Print button */}
              <button
                onClick={handlePrint}
                title="Imprimir factura"
                className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-3 py-1.5 text-xs font-extrabold shadow-md transition-all"
              >
                <Printer size={14} />
                Imprimir
              </button>
              {/* Close button */}
              <button
                onClick={onClose}
                title="Cerrar"
                className="flex items-center justify-center rounded-xl bg-white/10 hover:bg-rose-600 text-white w-8 h-8 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Invoice Card ────────────────────────────────────────────────── */}
          <div
            id="invoice-print-area"
            className="bg-white w-full rounded-2xl shadow-2xl p-5 text-gray-800 text-sm font-mono border border-slate-200 print:border-0 print:shadow-none"
          >
            {/* CANCELLED watermark */}
            {sale.is_cancelled && (
              <div className="text-center text-red-600 font-black text-xl border-2 border-red-600 rounded-lg mb-3 py-1 tracking-widest">
                ANULADA
              </div>
            )}

            {/* ── Header with Centered Branch Logo ─────────────────────────── */}
            <div className="text-center mb-2">
              <div className="flex justify-center mb-2">
                <img
                  src={
                    branch?.logo_url
                      ? branch.logo_url.startsWith('http') || branch.logo_url.startsWith('/')
                        ? branch.logo_url
                        : `https://dyfwcubkvgcqufpmtgvh.supabase.co/storage/v1/object/public/branch-logos/${branch.logo_url}`
                      : '/logo.png'
                  }
                  alt="Logo"
                  className="h-16 max-w-[150px] object-contain mx-auto print:max-h-14"
                  onError={(e) => {
                    const target = e.currentTarget
                    if (target.src !== window.location.origin + '/logo.png') {
                      target.src = '/logo.png'
                    }
                  }}
                />
              </div>
              <p className="font-black text-base uppercase leading-tight tracking-wide text-black">
                {branch?.name ?? 'MercaSmart'}
              </p>
              {branch?.address && (
                <p className="text-xs text-gray-700 leading-tight mt-0.5">
                  {branch.address}
                </p>
              )}
              {branch?.phone && (
                <p className="text-xs text-gray-700 leading-tight">
                  Tel: {branch.phone}
                </p>
              )}
              {branch?.rtn && (
                <p className="text-xs text-gray-800 font-bold leading-tight">
                  RTN: {branch.rtn}
                </p>
              )}
            </div>

            <Divider />

            {/* ── SAR / CAI Section ─────────────────────────────────────────── */}
            <div className="text-xs leading-snug mb-1">
              {sarConfig?.cai && (
                <p className="break-all">
                  <span className="font-bold">CAI:</span> {sarConfig.cai}
                </p>
              )}
              {sarConfig?.rango_inicio && sarConfig?.rango_fin && (
                <p className="break-all">
                  <span className="font-bold">Rango Autorizado:</span>{' '}
                  {sarConfig.rango_inicio} al {sarConfig.rango_fin}
                </p>
              )}
              {sarConfig?.fecha_limite && (
                <p>
                  <span className="font-bold">Fecha Límite de Emisión:</span>{' '}
                  {sarConfig.fecha_limite}
                </p>
              )}
              <p className="mt-1 font-bold text-sm">
                Factura No: {invoiceFormatted}
              </p>
            </div>

            <Divider />

            {/* ── Client Section ────────────────────────────────────────────── */}
            <div className="text-xs leading-snug mb-1">
              <p>
                <span className="font-bold">Cliente:</span>{' '}
                {sale.customer_name ?? 'Consumidor Final'}
              </p>
              <p>
                <span className="font-bold">RTN:</span>{' '}
                {sale.customer_rtn ?? 'CF'}
              </p>
              <p>
                <span className="font-bold">Fecha:</span> {date}
              </p>
              <p>
                <span className="font-bold">Hora:</span> {time}
              </p>
              <p>
                <span className="font-bold">Pago:</span> {paymentLabel}
              </p>
            </div>

            <Divider />

            {/* ── Products Table ────────────────────────────────────────────── */}
            <div className="mb-1">
              {/* Column headers */}
              <div className="flex justify-between text-xs font-bold mb-1 border-b border-gray-300 pb-0.5">
                <span className="flex-1">Descripción</span>
                <span className="w-8 text-center">Cant</span>
                <span className="w-16 text-right">P/U</span>
                <span className="w-20 text-right">Total</span>
              </div>

              {items.map((item, idx) => {
                const name =
                  item.product_name ?? item.product?.name ?? '(Sin nombre)'
                const code = item.product?.code
                const lineDiscount =
                  item.discount != null && item.discount > 0
                    ? item.discount
                    : null

                return (
                  <div key={idx} className="mb-1.5 last:mb-0">
                    <div className="flex justify-between text-xs">
                      <span className="flex-1 pr-1 break-words leading-tight">
                        {name}
                        {code && (
                          <span className="text-gray-500"> [{code}]</span>
                        )}
                      </span>
                      <span className="w-8 text-center shrink-0">
                        {item.quantity}
                      </span>
                      <span className="w-16 text-right shrink-0">
                        {formatLps(item.price)}
                      </span>
                      <span className="w-20 text-right shrink-0">
                        {formatLps(item.subtotal)}
                      </span>
                    </div>
                    {item.tax_rate > 0 && (
                      <div className="text-gray-500 text-xs pl-1">
                        ISV {(item.tax_rate * 100).toFixed(0)}% incl.
                      </div>
                    )}
                    {lineDiscount != null && (
                      <div className="text-gray-500 text-xs pl-1">
                        Desc: -{formatLps(lineDiscount)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <Divider />

            {/* ── Totals ────────────────────────────────────────────────────── */}
            <div className="text-xs leading-snug mb-1">
              <div className="flex justify-between">
                <span>Subtotal Gravado:</span>
                <span>{formatLps(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>ISV (15%):</span>
                <span>{formatLps(sale.tax_amount)}</span>
              </div>
              {sale.discount_amount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Descuento:</span>
                  <span>-{formatLps(sale.discount_amount)}</span>
                </div>
              )}
            </div>

            {/* Total — prominent */}
            <div className="flex justify-between items-center font-bold text-base border-t-2 border-b-2 border-gray-800 py-1 my-1">
              <span className="uppercase tracking-wide">TOTAL</span>
              <span className="text-lg">{formatLps(sale.total)}</span>
            </div>

            {/* ── Payment Detail ────────────────────────────────────────────── */}
            <div className="text-xs leading-snug mt-1 mb-1">
              <div className="flex justify-between">
                <span className="font-bold">Método de Pago:</span>
                <span>{paymentLabel}</span>
              </div>
              {isCash && sale.cash_received != null && (
                <div className="flex justify-between">
                  <span>Efectivo Recibido:</span>
                  <span>{formatLps(sale.cash_received)}</span>
                </div>
              )}
              {isCash && sale.change_given != null && (
                <div className="flex justify-between">
                  <span>Cambio:</span>
                  <span>{formatLps(sale.change_given)}</span>
                </div>
              )}
            </div>

            <Divider />

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <div className="text-center text-xs leading-snug text-gray-600">
              <p className="font-semibold text-sm">
                {sarConfig?.footer_text ?? '¡Gracias por su compra!'}
              </p>
              <p className="mt-1 italic">
                Este documento es una representación impresa de la factura
                electrónica.
              </p>
              {branch?.code && (
                <p className="mt-1 text-gray-400">
                  Sucursal: {branch.code}
                </p>
              )}
            </div>
          </div>

          {/* Bottom spacing */}
          <div className="h-6 print:hidden" />
        </div>
      </div>
    </>
  )
}

export default Invoice
