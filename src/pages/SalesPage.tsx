import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import { formatCurrency, formatDateTime } from '@/utils'
import type { Sale, SaleItem } from '@/types'
import Invoice from '@/components/pos/Invoice'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import {
  Receipt,
  Search,
  Calendar,
  Filter,
  Eye,
  XCircle,
  CheckCircle2,
  Printer,
  Loader2,
  User,
  Building2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function SalesPage() {
  const { profile, isSuperAdmin, isAdmin, isCajero } = useAuth()
  const { selectedBranchId, selectedBranch } = useBranch()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [cancelledFilter, setCancelledFilter] = useState('active')

  // Detail Modal (Invoice)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [sarConfig, setSarConfig] = useState<{
    cai?: string
    rango_inicio?: string
    rango_fin?: string
    fecha_limite?: string
    footer_text?: string
  }>({})

  // Cancel Modal
  const [cancelSaleId, setCancelSaleId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    loadSales()
    loadSarConfig()
  }, [selectedBranchId])

  const loadSarConfig = async () => {
    try {
      const { data } = await supabase.from('configuration').select('key, value')
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((r) => { map[r.key] = r.value })
        setSarConfig({
          cai: map.SAR_CAI || '',
          rango_inicio: map.SAR_RangeMin || '',
          rango_fin: map.SAR_RangeMax || '',
          fecha_limite: map.SAR_DeadlineDate || '',
          footer_text: map.TicketFooter || '',
        })
      }
    } catch {
      // ignore
    }
  }

  const loadSales = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('sales')
        .select('*, customer:customers(name, rtn), cashier:profiles(full_name), branch:branches(name)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (isCajero && profile?.id) {
        query = query.eq('user_id', profile.id)
      } else if (!isSuperAdmin && profile?.branch_id) {
        query = query.eq('branch_id', profile.branch_id)
      } else if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query
      if (error) throw error
      setSales((data as unknown as Sale[]) || [])
    } catch (err) {
      toast.error('Error al cargar historial de ventas')
    } finally {
      setLoading(false)
    }
  }

  const openSaleDetail = async (sale: Sale) => {
    setSelectedSale(sale)
    setLoadingItems(true)
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*, product:products(name, code, barcode)')
        .eq('sale_id', sale.id)

      if (error) throw error
      setSaleItems((data as unknown as SaleItem[]) || [])
    } catch (err) {
      toast.error('Error al cargar detalle de venta')
    } finally {
      setLoadingItems(false)
    }
  }

  const handleCancelSale = async () => {
    if (!cancelSaleId || !profile?.id) return
    setCancelling(true)
    try {
      const { data, error } = await supabase.rpc('cancel_sale', {
        p_sale_id: cancelSaleId,
        p_user_id: profile.id,
        p_reason: 'Cancelación solicitada por administración',
      })

      if (error) throw error
      toast.success('Venta cancelada e inventario restaurado correctamente')
      setCancelSaleId(null)
      if (selectedSale?.id === cancelSaleId) setSelectedSale(null)
      loadSales()
    } catch (err: any) {
      toast.error(err.message || 'Error al cancelar venta')
    } finally {
      setCancelling(false)
    }
  }

  const filtered = sales.filter((s) => {
    const q = search.toLowerCase()
    const matchesSearch =
      s.invoice_number.toLowerCase().includes(q) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(q))

    const matchesMethod =
      methodFilter === 'all' || s.payment_method === methodFilter

    const matchesCancelled =
      cancelledFilter === 'all' ||
      (cancelledFilter === 'active' && !s.is_cancelled) ||
      (cancelledFilter === 'cancelled' && s.is_cancelled)

    return matchesSearch && matchesMethod && matchesCancelled
  })

  // Summary Metrics for filtered view
  const totalPeriod = filtered
    .filter((s) => !s.is_cancelled)
    .reduce((sum, s) => sum + s.total, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-sky-500" />
            Historial de Facturas & Ventas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Consulta y audita las ventas realizadas con numeración fiscal SAR
          </p>
        </div>

        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Total filtrado:
          </span>
          <span className="text-lg font-black text-emerald-500">
            {formatCurrency(totalPeriod)}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número de factura o cliente..."
              className="input-base pl-10 text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="input-base text-sm"
            >
              <option value="all">Todos los Métodos de Pago</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Crédito">Crédito</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={cancelledFilter}
              onChange={(e) => setCancelledFilter(e.target.value)}
              className="input-base text-sm"
            >
              <option value="active">Solo Ventas Válidas</option>
              <option value="cancelled">Solo Canceladas / Anuladas</option>
              <option value="all">Todas las Facturas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales List Table */}
      {loading ? (
        <SkeletonTable rows={6} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No se encontraron ventas"
            description="No hay registros que coincidan con los filtros aplicados."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-container border-0">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Factura SAR</th>
                  <th>Fecha & Hora</th>
                  <th>Cliente</th>
                  <th>Cajero</th>
                  <th>Método Pago</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className={s.is_cancelled ? 'opacity-50' : ''}>
                    <td>
                      <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2 py-1 rounded-md border border-sky-200 dark:border-sky-800">
                        {s.invoice_number}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">{formatDateTime(s.created_at)}</td>
                    <td>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">
                        {s.customer_name || 'Consumidor Final'}
                      </p>
                      {s.customer_rtn && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          RTN: {s.customer_rtn}
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-slate-600 dark:text-slate-300">
                      {s.profile?.full_name || 'Cajero'}
                    </td>
                    <td>
                      <span className="badge-gray text-[11px]">{s.payment_method}</span>
                    </td>
                    <td className="text-right font-black text-sm text-slate-900 dark:text-white">
                      {formatCurrency(s.total)}
                    </td>
                    <td className="text-center">
                      <span className={s.is_cancelled ? 'badge-red' : 'badge-green'}>
                        {s.is_cancelled ? 'Anulada' : 'Emitida'}
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => openSaleDetail(s)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Professional Fiscal Invoice Modal */}
      {selectedSale && !loadingItems && (
        <Invoice
          sale={{
            id: String(selectedSale.id),
            invoice_number: selectedSale.invoice_number,
            created_at: selectedSale.created_at,
            payment_method: selectedSale.payment_method,
            cash_received: selectedSale.cash_received,
            change_given: selectedSale.change_given,
            subtotal: selectedSale.subtotal,
            tax_amount: selectedSale.tax_amount,
            discount_amount: selectedSale.discount_amount,
            total: selectedSale.total,
            customer_name: selectedSale.customer_name || (selectedSale as any).customer?.name || 'Consumidor Final',
            customer_rtn: selectedSale.customer_rtn || (selectedSale as any).customer?.rtn || '',
            is_cancelled: selectedSale.is_cancelled,
          }}
          items={saleItems.map((item) => ({
            product_name: item.product?.name || `Producto #${item.product_id}`,
            product: {
              name: item.product?.name || `Producto #${item.product_id}`,
              code: item.product?.code,
            },
            quantity: Number(item.quantity),
            price: Number(item.price),
            tax_rate: Number(item.tax_rate),
            subtotal: Number(item.subtotal),
            discount: Number(item.discount || 0),
          }))}
          branch={
            selectedBranch || {
              name: 'MercaSmart',
              address: '',
              phone: '',
              rtn: '',
              logo_url: '/logo.png',
            }
          }
          sarConfig={sarConfig}
          onClose={() => setSelectedSale(null)}
          onCancel={isAdmin ? (id) => setCancelSaleId(Number(id)) : undefined}
        />
      )}

      {/* Cancel Confirm Dialog */}
      <ConfirmDialog
        isOpen={cancelSaleId !== null}
        onClose={() => setCancelSaleId(null)}
        onConfirm={handleCancelSale}
        title="Anular Factura Fiscal"
        message="¿Estás seguro de anular esta venta? Esta operación reintegrará automáticamente las existencias de todos los productos al inventario y revertirá los saldos."
        confirmLabel="Anular Factura"
        loading={cancelling}
      />
    </div>
  )
}
