import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import { formatCurrency, formatDateTime } from '@/utils'
import type { Sale, SaleItem } from '@/types'
import Modal from '@/components/ui/Modal'
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

  // Detail Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  // Cancel Modal
  const [cancelSaleId, setCancelSaleId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    loadSales()
  }, [selectedBranchId])

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

      {/* Sale Detail Modal */}
      {selectedSale && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSale(null)}
          title={`Detalle de Venta · Factura ${selectedSale.invoice_number}`}
          size="lg"
          footer={
            <div className="flex gap-2 w-full justify-between items-center">
              <div>
                {!selectedSale.is_cancelled && isAdmin && (
                  <button
                    onClick={() => setCancelSaleId(selectedSale.id)}
                    className="btn-danger text-xs"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Anular Factura & Devolver Stock</span>
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Imprimir Ticket
                </button>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="btn-primary text-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block">Fecha y Hora</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDateTime(selectedSale.created_at)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Cliente</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSale.customer_name || 'Consumidor Final'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Método de Pago</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSale.payment_method}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Estado</span>
                <span
                  className={
                    selectedSale.is_cancelled
                      ? 'text-rose-500 font-bold'
                      : 'text-emerald-500 font-bold'
                  }
                >
                  {selectedSale.is_cancelled ? 'Factura Anulada' : 'Factura Válida'}
                </span>
              </div>
            </div>

            {/* Items Table */}
            {loadingItems ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
                Cargando productos...
              </div>
            ) : (
              <div className="table-container">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="text-center">Cant</th>
                      <th className="text-right">Precio</th>
                      <th className="text-center">ISV</th>
                      <th className="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <p className="font-bold text-xs text-slate-900 dark:text-white">
                            {item.product?.name || `Producto #${item.product_id}`}
                          </p>
                          <span className="font-mono text-[10px] text-slate-400">
                            {item.product?.code}
                          </span>
                        </td>
                        <td className="text-center font-bold text-xs">{item.quantity}</td>
                        <td className="text-right text-xs">{formatCurrency(item.price)}</td>
                        <td className="text-center text-xs">{item.tax_rate}%</td>
                        <td className="text-right font-black text-xs">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals Summary */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal General:</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Impuesto ISV Incluido:</span>
                <span>{formatCurrency(selectedSale.tax_amount)}</span>
              </div>
              {selectedSale.discount_amount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Descuento Aplicado:</span>
                  <span>-{formatCurrency(selectedSale.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white">
                <span>TOTAL FACTURADO:</span>
                <span className="text-emerald-500 text-base">
                  {formatCurrency(selectedSale.total)}
                </span>
              </div>
            </div>
          </div>
        </Modal>
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
