import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import { formatCurrency, formatDateTime } from '@/utils'
import type { Product, InventoryTransaction } from '@/types'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Package,
  Layers,
  History,
  Loader2,
  Building2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function InventoryPage() {
  const { profile, isSuperAdmin, isAdmin } = useAuth()
  const { selectedBranchId, activeBranchId, selectedBranch } = useBranch()
  const [activeTab, setActiveTab] = useState<'movements' | 'adjust' | 'stock'>('movements')

  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Adjustment Form State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [adjustType, setAdjustType] = useState<'Entrada' | 'Salida' | 'Ajuste'>('Entrada')
  const [adjustQty, setAdjustQty] = useState('1')
  const [adjustRemarks, setAdjustRemarks] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    loadInventoryData()
  }, [selectedBranchId])

  const loadInventoryData = async () => {
    setLoading(true)
    try {
      let tQuery = supabase
        .from('inventory_transactions')
        .select('*, product:products(name, code), user:profiles(full_name), branch:branches(name)')
        .order('created_at', { ascending: false })
        .limit(100)

      let pQuery = supabase
        .from('products')
        .select('*, category:categories(name), branch:branches(name)')
        .eq('is_active', true)
        .order('name')

      if (selectedBranchId) {
        tQuery = tQuery.eq('branch_id', selectedBranchId)
        pQuery = pQuery.eq('branch_id', selectedBranchId)
      } else if (!isSuperAdmin && profile?.branch_id) {
        tQuery = tQuery.eq('branch_id', profile.branch_id)
        pQuery = pQuery.eq('branch_id', profile.branch_id)
      }

      const [tRes, pRes] = await Promise.all([tQuery, pQuery])

      if (tRes.data) setTransactions(tRes.data as unknown as InventoryTransaction[])
      if (pRes.data) setProducts(pRes.data as Product[])
    } catch (err) {
      toast.error('Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }

  // Handle Manual Inventory Adjustment RPC
  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !profile?.id) {
      toast.error('Selecciona un producto')
      return
    }
    const qty = parseFloat(adjustQty) || 0
    if (qty <= 0 && adjustType !== 'Ajuste') {
      toast.error('La cantidad debe ser mayor a cero')
      return
    }
    if (!adjustRemarks.trim()) {
      toast.error('Debes ingresar un motivo / observación para la auditoría')
      return
    }

    setAdjusting(true)
    try {
      const { data, error } = await supabase.rpc('adjust_inventory', {
        p_product_id: selectedProduct.id,
        p_quantity: qty,
        p_type: adjustType,
        p_remarks: adjustRemarks.trim(),
        p_user_id: profile.id,
      })

      if (error) throw error
      toast.success('Inventario actualizado con éxito')
      setSelectedProduct(null)
      setAdjustQty('1')
      setAdjustRemarks('')
      setActiveTab('movements')
      loadInventoryData()
    } catch (err: any) {
      toast.error(err.message || 'Error al ajustar inventario')
    } finally {
      setAdjusting(false)
    }
  }

  const filteredTransactions = transactions.filter((t) => {
    const q = search.toLowerCase()
    const matchesSearch =
      (t.product?.name && t.product.name.toLowerCase().includes(q)) ||
      (t.product?.code && t.product.code.toLowerCase().includes(q)) ||
      (t.remarks && t.remarks.toLowerCase().includes(q))

    const matchesType = typeFilter === 'all' || t.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-sky-500" />
            Kardex & Control de Inventario
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registro de entradas, salidas, ventas y ajustes con trazabilidad completa
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('adjust')}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            <span>Ajuste / Entrada Manual</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'movements'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Historial de Movimientos
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'stock'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Resumen de Existencias
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('adjust')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'adjust'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Formulario de Ajuste
          </button>
        )}
      </div>

      {/* TAB 1: MOVEMENTS */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por producto, código o motivo..."
                  className="input-base pl-10 text-sm"
                />
              </div>
              <div className="sm:col-span-4">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="input-base text-sm"
                >
                  <option value="all">Todos los Movimientos</option>
                  <option value="Entrada">Entradas (Compras/Ingresos)</option>
                  <option value="Venta">Ventas de POS</option>
                  <option value="Salida">Salidas (Mermas/Dañados)</option>
                  <option value="Ajuste">Ajustes Directos</option>
                  <option value="Devolución">Devoluciones / Anuladas</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={6} />
          ) : filteredTransactions.length === 0 ? (
            <div className="card">
              <EmptyState
                title="No hay movimientos registrados"
                description="Las ventas y entradas de compras se reflejarán aquí automáticamente."
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="table-container border-0">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Fecha & Hora</th>
                      <th>Producto</th>
                      <th className="text-center">Tipo</th>
                      <th className="text-center">Cantidad</th>
                      <th>Observación / Factura</th>
                      <th>Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t) => {
                      const isPositive =
                        t.type === 'Entrada' || t.type === 'Devolución'
                      return (
                        <tr key={t.id}>
                          <td className="text-xs text-slate-500 font-mono">
                            {formatDateTime(t.created_at)}
                          </td>
                          <td>
                            <p className="font-bold text-xs text-slate-900 dark:text-white">
                              {t.product?.name || `Producto #${t.product_id}`}
                            </p>
                            <span className="font-mono text-[10px] text-slate-400">
                              {t.product?.code}
                            </span>
                          </td>
                          <td className="text-center">
                            <span
                              className={`badge-${
                                t.type === 'Entrada'
                                  ? 'green'
                                  : t.type === 'Venta'
                                  ? 'blue'
                                  : t.type === 'Devolución'
                                  ? 'yellow'
                                  : 'red'
                              }`}
                            >
                              {t.type}
                            </span>
                          </td>
                          <td className="text-center font-mono font-bold text-xs">
                            <span
                              className={
                                isPositive ? 'text-emerald-500' : 'text-rose-500'
                              }
                            >
                              {isPositive ? '+' : '-'}
                              {t.quantity}
                            </span>
                          </td>
                          <td className="text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {t.remarks || '-'}
                          </td>
                          <td className="text-xs text-slate-500">
                            {t.profile?.full_name || 'Sistema'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RESUMEN DE STOCK */}
      {activeTab === 'stock' && (
        <div className="card overflow-hidden">
          <div className="table-container border-0">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="text-center">Stock Actual</th>
                  <th className="text-center">Mínimo</th>
                  <th className="text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isOut = p.stock <= 0
                  const isLow = p.stock <= p.min_stock && !isOut
                  return (
                    <tr key={p.id}>
                      <td className="font-mono text-xs text-sky-500 font-bold">{p.code}</td>
                      <td className="font-bold text-xs text-slate-900 dark:text-white">
                        {p.name}
                      </td>
                      <td>
                        <span className="badge-gray text-xs">{p.category?.name || '-'}</span>
                      </td>
                      <td className="text-center font-black font-mono text-sm">
                        <span
                          className={
                            isOut
                              ? 'text-rose-500'
                              : isLow
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                          }
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="text-center font-mono text-xs text-slate-400">
                        {p.min_stock}
                      </td>
                      <td className="text-center">
                        <span
                          className={
                            isOut ? 'badge-red' : isLow ? 'badge-yellow' : 'badge-green'
                          }
                        >
                          {isOut ? 'Agotado' : isLow ? 'Stock Bajo' : 'Óptimo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ADJUST FORM */}
      {activeTab === 'adjust' && isAdmin && (
        <div className="card p-6 max-w-xl mx-auto space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-sky-500" />
              Ajuste de Inventario / Entrada de Mercadería
            </h3>
            <p className="text-xs text-slate-500">
              Registra compras recibidas, mermas o ajustes directos de conteo físico.
            </p>
          </div>

          <form onSubmit={handleAdjustInventory} className="space-y-4 pt-2">
            <div>
              <label className="label">Producto a Ajustar *</label>
              <select
                required
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const p = products.find((prod) => prod.id === parseInt(e.target.value, 10))
                  setSelectedProduct(p || null)
                }}
                className="input-base text-sm"
              >
                <option value="">Seleccionar Producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock Actual: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <span className="text-slate-500">Stock Actual en Sistema:</span>
                <span className="font-mono font-black text-sm text-sky-500">
                  {selectedProduct.stock} unidades
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Tipo de Movimiento *</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="input-base text-sm"
                >
                  <option value="Entrada">Entrada (+) [Compras / Proveedor]</option>
                  <option value="Salida">Salida (-) [Merma / Vencido / Dañado]</option>
                  <option value="Ajuste">Ajuste Directo (=) [Conteo Físico]</option>
                </select>
              </div>

              <div>
                <label className="label">
                  {adjustType === 'Ajuste' ? 'Nuevo Stock Real *' : 'Cantidad a Mover *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="input-base font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="label">Motivo u Observación (Auditoría) *</label>
              <textarea
                required
                value={adjustRemarks}
                onChange={(e) => setAdjustRemarks(e.target.value)}
                placeholder="ej. Factura de compra #1234 de Embotelladora Sula, producto roto en bodega, etc."
                className="input-base text-xs h-20 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('movements')}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" disabled={adjusting} className="btn-primary">
                {adjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Registrar Movimiento</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
