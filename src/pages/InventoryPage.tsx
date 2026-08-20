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
  Building2,
  TrendingDown,
  TrendingUp,
  CheckCircle2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function InventoryPage() {
  const { profile, isSuperAdmin, isAdmin } = useAuth()
  const { selectedBranchId, activeBranchId, selectedBranch } = useBranch()

  // Default to 'stock' so user sees all items immediately!
  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'adjust'>('stock')

  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [loading, setLoading] = useState(true)

  // Filters for Stock Tab
  const [stockSearch, setStockSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')

  // Filters for Movements Tab
  const [movementSearch, setMovementSearch] = useState('')
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
      let pQuery = supabase
        .from('products')
        .select('*, category:categories(name), brand:brands(name), branch:branches(name)')
        .eq('is_active', true)
        .order('id', { ascending: false })

      let tQuery = supabase
        .from('inventory_transactions')
        .select('*, product:products(name, code), user:profiles(full_name), branch:branches(name)')
        .order('created_at', { ascending: false })
        .limit(150)

      if (selectedBranchId) {
        pQuery = pQuery.eq('branch_id', selectedBranchId)
        tQuery = tQuery.eq('branch_id', selectedBranchId)
      }

      const [pRes, tRes] = await Promise.all([pQuery, tQuery])

      if (pRes.data) setProducts(pRes.data as unknown as Product[])
      if (tRes.data) setTransactions(tRes.data as unknown as InventoryTransaction[])
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }

  // Handle Manual Inventory Adjustment
  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !profile?.id) {
      toast.error('Selecciona un producto del catálogo')
      return
    }
    const qty = parseFloat(adjustQty) || 0
    if (qty <= 0 && adjustType !== 'Ajuste') {
      toast.error('La cantidad debe ser mayor a cero')
      return
    }
    if (!adjustRemarks.trim()) {
      toast.error('Debes ingresar un motivo para la auditoría de inventario')
      return
    }

    setAdjusting(true)
    try {
      // Calculate new stock
      let newStock = selectedProduct.stock
      if (adjustType === 'Entrada') newStock += qty
      else if (adjustType === 'Salida') newStock = Math.max(0, newStock - qty)
      else if (adjustType === 'Ajuste') newStock = qty

      // Update product stock
      const { error: pErr } = await supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', selectedProduct.id)

      if (pErr) throw pErr

      // Insert transaction record
      const { error: tErr } = await supabase.from('inventory_transactions').insert({
        product_id: selectedProduct.id,
        user_id: profile.id,
        branch_id: activeBranchId,
        type: adjustType,
        quantity: qty,
        remarks: adjustRemarks.trim(),
      })

      if (tErr) throw tErr

      toast.success('Inventario ajustado y registrado correctamente')
      setSelectedProduct(null)
      setAdjustQty('1')
      setAdjustRemarks('')
      setActiveTab('stock')
      loadInventoryData()
    } catch (err: any) {
      toast.error(err.message || 'Error al ajustar inventario')
    } finally {
      setAdjusting(false)
    }
  }

  // Quick action from stock table to adjust
  const openAdjustForProduct = (p: Product) => {
    setSelectedProduct(p)
    setAdjustType('Entrada')
    setAdjustQty('10')
    setAdjustRemarks('Reabastecimiento de producto')
    setActiveTab('adjust')
  }

  // Computed Stock Stats
  const totalItems = products.length
  const totalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0)
  const lowStockCount = products.filter((p) => p.stock <= p.min_stock && p.stock > 0).length
  const outOfStockCount = products.filter((p) => p.stock <= 0).length
  const totalInventoryValue = products.reduce(
    (acc, p) => acc + (p.stock || 0) * (p.cost_price || 0),
    0
  )

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = stockSearch.toLowerCase()
    const matchQuery =
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q))

    let matchStock = true
    if (stockFilter === 'low') matchStock = p.stock <= p.min_stock && p.stock > 0
    if (stockFilter === 'out') matchStock = p.stock <= 0

    return matchQuery && matchStock
  })

  // Filtered Transactions
  const filteredTransactions = transactions.filter((t) => {
    const q = movementSearch.toLowerCase()
    const matchQuery =
      (t.product?.name && t.product.name.toLowerCase().includes(q)) ||
      (t.product?.code && t.product.code.toLowerCase().includes(q)) ||
      (t.remarks && t.remarks.toLowerCase().includes(q))

    const matchType = typeFilter === 'all' || t.type === typeFilter
    return matchQuery && matchType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-sky-500" />
            Control de Inventario & Kardex
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Control de existencias, auditoría de movimientos y ajustes de mercadería
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedProduct(null)
              setActiveTab('adjust')
            }}
            className="btn-primary w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            <span>Ajustar Inventario</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <p className="text-xs text-slate-400">Productos Registrados</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">{totalItems}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-400">Unidades en Stock</p>
          <p className="text-xl font-black text-sky-500">{totalUnits}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-400">Alertas de Stock</p>
          <div className="flex items-center gap-2 mt-1">
            {lowStockCount > 0 && (
              <span className="badge-amber text-xs font-bold">{lowStockCount} bajos</span>
            )}
            {outOfStockCount > 0 && (
              <span className="badge-red text-xs font-bold">{outOfStockCount} agotados</span>
            )}
            {lowStockCount === 0 && outOfStockCount === 0 && (
              <span className="badge-green text-xs font-bold">Todo en orden</span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-400">Valor en Inventario</p>
          <p className="text-xl font-black text-emerald-500">
            {formatCurrency(totalInventoryValue)}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'stock'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Existencias de Productos ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'movements'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Movimientos & Kardex ({transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('adjust')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'adjust'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Entradas, Salidas y Ajuste Manual</span>
        </button>
      </div>

      {/* TAB 1: STOCK / EXISTENCIAS */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="Buscar producto por nombre, código o barra..."
                  className="input-base pl-10 text-sm"
                />
              </div>
              <div className="sm:col-span-4">
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  className="input-base text-sm"
                >
                  <option value="all">Todas las Existencias</option>
                  <option value="low">⚠️ Stock Bajo (≤ Mínimo)</option>
                  <option value="out">⛔ Agotados (0 existencias)</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={6} />
          ) : filteredProducts.length === 0 ? (
            <div className="card">
              <EmptyState
                title="No hay existencias registradas"
                description="Agrega nuevos productos en el catálogo para comenzar el control de inventario."
              />
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="grid grid-cols-1 gap-3 sm:hidden">
                {filteredProducts.map((p) => {
                  const isLow = p.stock <= p.min_stock && p.stock > 0
                  const isOut = p.stock <= 0

                  return (
                    <div key={p.id} className="card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-sky-500 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                            {p.code}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                            {p.name}
                          </h3>
                          {p.category && (
                            <p className="text-[11px] text-slate-400">{p.category.name}</p>
                          )}
                        </div>

                        <span
                          className={`font-black px-2.5 py-1 rounded-full text-xs ${
                            isOut
                              ? 'badge-red'
                              : isLow
                              ? 'badge-amber'
                              : 'badge-green'
                          }`}
                        >
                          {p.stock} unid.
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">
                        <span>Costo: {formatCurrency(p.cost_price)}</span>
                        <span>Venta: {formatCurrency(p.sale_price)}</span>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => openAdjustForProduct(p)}
                          className="btn-secondary text-xs py-1.5 px-3 w-full justify-center"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Reabastecer / Ajustar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table View */}
              <div className="card overflow-hidden hidden sm:block">
                <div className="table-container border-0">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th className="text-right">Precio Costo</th>
                        <th className="text-right">Precio Venta</th>
                        <th className="text-center">Stock Actual</th>
                        <th className="text-center">Stock Mínimo</th>
                        <th className="text-center">Estado</th>
                        <th className="text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => {
                        const isLow = p.stock <= p.min_stock && p.stock > 0
                        const isOut = p.stock <= 0

                        return (
                          <tr key={p.id}>
                            <td>
                              <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                                {p.code}
                              </span>
                            </td>
                            <td>
                              <p className="font-bold text-sm text-slate-900 dark:text-white">
                                {p.name}
                              </p>
                            </td>
                            <td>
                              <span className="badge-gray text-[11px]">
                                {p.category?.name || 'General'}
                              </span>
                            </td>
                            <td className="text-right font-mono text-xs text-slate-500">
                              {formatCurrency(p.cost_price)}
                            </td>
                            <td className="text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                              {formatCurrency(p.sale_price)}
                            </td>
                            <td className="text-center font-mono font-black">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  isOut
                                    ? 'badge-red'
                                    : isLow
                                    ? 'badge-amber'
                                    : 'badge-green'
                                }`}
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
                                  isOut
                                    ? 'badge-red'
                                    : isLow
                                    ? 'badge-amber'
                                    : 'badge-green'
                                }
                              >
                                {isOut ? 'Agotado' : isLow ? 'Stock Bajo' : 'Disponible'}
                              </span>
                            </td>
                            <td className="text-center">
                              <button
                                onClick={() => openAdjustForProduct(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800"
                                title="Reabastecer o Ajustar Stock"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: MOVEMENTS / KARDEX */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
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
                  <option value="all">Todos los Tipos</option>
                  <option value="Entrada">📥 Entradas / Compras</option>
                  <option value="Salida">📤 Salidas / Bajas</option>
                  <option value="Venta">🛒 Ventas (POS)</option>
                  <option value="Ajuste">⚙️ Ajustes Manuales</option>
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
                description="Los movimientos se registran automáticamente con cada venta o ajuste manual."
              />
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-3 sm:hidden">
                {filteredTransactions.map((t) => {
                  const isEntry = t.type === 'Entrada'
                  const isSale = t.type === 'Venta'
                  const isExit = t.type === 'Salida'

                  return (
                    <div key={t.id} className="card p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isEntry
                                ? 'badge-green'
                                : isSale
                                ? 'badge-blue'
                                : isExit
                                ? 'badge-red'
                                : 'badge-amber'
                            }`}
                          >
                            {isEntry && <ArrowDownLeft className="w-3 h-3" />}
                            {isExit && <ArrowUpRight className="w-3 h-3" />}
                            {t.type}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                            {t.product?.name || 'Producto'}
                          </h4>
                          <span className="font-mono text-[11px] text-slate-400">
                            {t.product?.code}
                          </span>
                        </div>

                        <span
                          className={`font-black text-sm font-mono ${
                            isEntry ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {isEntry ? `+${t.quantity}` : `-${t.quantity}`}
                        </span>
                      </div>

                      {t.remarks && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                          {t.remarks}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>{formatDateTime(t.created_at)}</span>
                        <span>{t.user?.full_name || 'Sistema'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table */}
              <div className="card overflow-hidden hidden sm:block">
                <div className="table-container border-0">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Fecha & Hora</th>
                        <th>Código</th>
                        <th>Producto</th>
                        <th className="text-center">Tipo</th>
                        <th className="text-right">Cantidad</th>
                        <th>Motivo / Observación</th>
                        <th>Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((t) => {
                        const isEntry = t.type === 'Entrada'
                        const isSale = t.type === 'Venta'
                        const isExit = t.type === 'Salida'

                        return (
                          <tr key={t.id}>
                            <td className="text-xs text-slate-500 font-mono">
                              {formatDateTime(t.created_at)}
                            </td>
                            <td>
                              <span className="font-mono text-xs text-slate-500">
                                {t.product?.code || '-'}
                              </span>
                            </td>
                            <td>
                              <p className="font-bold text-sm text-slate-900 dark:text-white">
                                {t.product?.name || 'Producto'}
                              </p>
                            </td>
                            <td className="text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  isEntry
                                    ? 'badge-green'
                                    : isSale
                                    ? 'badge-blue'
                                    : isExit
                                    ? 'badge-red'
                                    : 'badge-amber'
                                }`}
                              >
                                {isEntry && <ArrowDownLeft className="w-3 h-3" />}
                                {isExit && <ArrowUpRight className="w-3 h-3" />}
                                {t.type}
                              </span>
                            </td>
                            <td className="text-right font-mono font-black text-sm">
                              <span
                                className={
                                  isEntry
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-800 dark:text-slate-200'
                                }
                              >
                                {isEntry ? `+${t.quantity}` : `-${t.quantity}`}
                              </span>
                            </td>
                            <td className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                              {t.remarks || '-'}
                            </td>
                            <td className="text-xs font-medium text-slate-500">
                              {t.user?.full_name || 'Sistema'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: ADJUSTMENT / AJUSTE MANUAL */}
      {activeTab === 'adjust' && (
        <div className="card p-6 max-w-2xl mx-auto space-y-5">
          <h3 className="font-bold text-base text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-sky-500" />
            Registro de Movimiento Manual de Inventario
          </h3>

          <form onSubmit={handleAdjustInventory} className="space-y-4">
            <div>
              <label className="label">Producto *</label>
              <select
                required
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const p = products.find((x) => x.id === parseInt(e.target.value, 10))
                  setSelectedProduct(p || null)
                }}
                className="input-base font-semibold"
              >
                <option value="">Selecciona un producto del catálogo...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name} (Stock Actual: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-sky-900 dark:text-sky-200">
                    {selectedProduct.name}
                  </p>
                  <p className="text-sky-600 dark:text-sky-400">
                    Costo: {formatCurrency(selectedProduct.cost_price)} | Venta: {formatCurrency(selectedProduct.sale_price)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400">Stock Actual</p>
                  <p className="text-base font-black text-sky-600 dark:text-sky-300">
                    {selectedProduct.stock} unid.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Tipo de Movimiento *</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="input-base font-semibold"
                >
                  <option value="Entrada">📥 Entrada / Compra (Suma al stock)</option>
                  <option value="Salida">📤 Salida / Merma / Dañado (Resta al stock)</option>
                  <option value="Ajuste">⚙️ Ajuste Físico (Fija el stock exacto)</option>
                </select>
              </div>

              <div>
                <label className="label">
                  {adjustType === 'Ajuste' ? 'Nuevo Stock Físico *' : 'Cantidad a Mover *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="ej. 10"
                  className="input-base font-mono font-bold text-sky-600 dark:text-sky-400"
                />
              </div>
            </div>

            <div>
              <label className="label">Motivo u Observación de la Auditoría *</label>
              <textarea
                required
                rows={3}
                value={adjustRemarks}
                onChange={(e) => setAdjustRemarks(e.target.value)}
                placeholder="ej. Recepción de pedido de proveedor, producto vencido, conteo físico..."
                className="input-base text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={adjusting || !selectedProduct}
                className="btn-primary"
              >
                {adjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Aplicar Movimiento</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
