import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import { formatCurrency } from '@/utils'
import type { Product, Category, Brand, Supplier } from '@/types'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  Barcode,
  TrendingUp,
  Boxes,
  Loader2,
  CheckCircle2,
  XCircle,
  Building2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const { isAdmin, isSuperAdmin } = useAuth()
  const { selectedBranchId, activeBranchId, selectedBranch, isGlobalView } = useBranch()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  // Form State
  const [code, setCode] = useState('')
  const [barcode, setBarcode] = useState('')
  const [name, setName] = useState('')
  const [costPrice, setCostPrice] = useState('0')
  const [salePrice, setSalePrice] = useState('0')
  const [taxRate, setTaxRate] = useState('15')
  const [stock, setStock] = useState('0')
  const [minStock, setMinStock] = useState('5')
  const [categoryId, setCategoryId] = useState<string>('')
  const [brandId, setBrandId] = useState<string>('')
  const [supplierId, setSupplierId] = useState<string>('')
  const [isActive, setIsActive] = useState(true)

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedBranchId])

  const loadData = async () => {
    setLoading(true)
    try {
      let pQuery = supabase
        .from('products')
        .select('*, category:categories(name), brand:brands(name), supplier:suppliers(name), branch:branches(name)')
        .order('id', { ascending: false })

      if (selectedBranchId) {
        pQuery = pQuery.eq('branch_id', selectedBranchId)
      }

      const [pRes, cRes, bRes, sRes] = await Promise.all([
        pQuery,
        supabase.from('categories').select('*').eq('is_active', true).order('name'),
        supabase.from('brands').select('*').eq('is_active', true).order('name'),
        supabase.from('suppliers').select('*').eq('is_active', true).order('name'),
      ])

      if (pRes.data) setProducts(pRes.data as unknown as Product[])
      if (cRes.data) setCategories(cRes.data as Category[])
      if (bRes.data) setBrands(bRes.data as Brand[])
      if (sRes.data) setSuppliers(sRes.data as Supplier[])
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingProduct(null)
    const nextCode = `PRD-${String(products.length + 1).padStart(4, '0')}`
    setCode(nextCode)
    setBarcode('')
    setName('')
    setCostPrice('0')
    setSalePrice('0')
    setTaxRate('15')
    setStock('10')
    setMinStock('5')
    setCategoryId(categories[0]?.id ? String(categories[0].id) : '')
    setBrandId('')
    setSupplierId('')
    setIsActive(true)
    setIsModalOpen(true)
  }

  const openEditModal = (p: Product) => {
    setEditingProduct(p)
    setCode(p.code)
    setBarcode(p.barcode || '')
    setName(p.name)
    setCostPrice(String(p.cost_price))
    setSalePrice(String(p.sale_price))
    setTaxRate(String(p.tax_rate))
    setStock(String(p.stock))
    setMinStock(String(p.min_stock))
    setCategoryId(p.category_id ? String(p.category_id) : '')
    setBrandId(p.brand_id ? String(p.brand_id) : '')
    setSupplierId(p.supplier_id ? String(p.supplier_id) : '')
    setIsActive(p.is_active)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) {
      toast.error('Código y Nombre son requeridos')
      return
    }

    const cost = parseFloat(costPrice) || 0
    const sale = parseFloat(salePrice) || 0
    const stockVal = parseFloat(stock) || 0
    const minVal = parseFloat(minStock) || 0
    const tax = parseFloat(taxRate) || 0

    if (sale < 0 || cost < 0) {
      toast.error('Los precios no pueden ser negativos')
      return
    }

    setSaving(true)
    try {
      const payload = {
        code: code.trim(),
        barcode: barcode.trim(),
        name: name.trim(),
        cost_price: cost,
        sale_price: sale,
        tax_rate: tax,
        stock: stockVal,
        min_stock: minVal,
        category_id: categoryId ? parseInt(categoryId, 10) : null,
        brand_id: brandId ? parseInt(brandId, 10) : null,
        supplier_id: supplierId ? parseInt(supplierId, 10) : null,
        branch_id: activeBranchId,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id)

        if (error) throw error
        toast.success('Producto actualizado exitosamente')
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
        toast.success('Producto creado con éxito')
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar producto')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error: hardErr } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteTarget.id)

      if (hardErr) {
        // Fallback to soft delete if there are foreign keys (sales, kardex)
        const { error: softErr } = await supabase
          .from('products')
          .update({ is_active: false })
          .eq('id', deleteTarget.id)

        if (softErr) throw softErr
        toast.success('Producto desactivado (tiene ventas asociadas)')
      } else {
        toast.success('Producto eliminado')
      }

      setDeleteTarget(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar producto')
    } finally {
      setDeleting(false)
    }
  }

  // Margin calculation
  const marginPercent = useMemo(() => {
    const cost = parseFloat(costPrice) || 0
    const sale = parseFloat(salePrice) || 0
    if (cost <= 0 || sale <= 0) return 0
    return Math.round(((sale - cost) / cost) * 100)
  }, [costPrice, salePrice])

  // Filtered list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase()
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))

      const matchesCat =
        categoryFilter === 'all' || p.category_id === parseInt(categoryFilter, 10)

      let matchesStock = true
      if (stockFilter === 'low') matchesStock = p.stock <= p.min_stock && p.stock > 0
      if (stockFilter === 'out') matchesStock = p.stock <= 0

      return matchesSearch && matchesCat && matchesStock
    })
  }, [products, search, categoryFilter, stockFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="w-7 h-7 text-sky-500" />
            Catálogo de Productos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra existencias, precios e impuestos (ISV 0%, 15%, 18%)
          </p>
        </div>

        {isAdmin && (
          <button onClick={openCreateModal} className="btn-primary w-full sm:w-auto justify-center">
            <Plus className="w-5 h-5" />
            <span>Nuevo Producto</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, código o barra..."
              className="input-base pl-10 text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-base text-sm"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div className="sm:col-span-3">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="input-base text-sm"
            >
              <option value="all">Todo el Inventario</option>
              <option value="low">⚠️ Stock Bajo (≤ Mínimo)</option>
              <option value="out">⛔ Agotados (0 existencias)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Display */}
      {loading ? (
        <SkeletonTable rows={6} />
      ) : filteredProducts.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No se encontraron productos"
            description="Intenta ajustando los filtros de búsqueda o agrega un nuevo producto."
            action={
              isAdmin ? (
                <button onClick={openCreateModal} className="btn-primary text-xs">
                  <Plus className="w-4 h-4" /> Agregar Producto
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile View: Rich Cards */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filteredProducts.map((p) => {
              const isLow = p.stock <= p.min_stock && p.stock > 0
              const isOut = p.stock <= 0

              return (
                <div key={p.id} className="card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-sky-500 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                          {p.code}
                        </span>
                        {p.category && (
                          <span className="badge-gray text-[10px]">{p.category.name}</span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                        {p.name}
                      </h3>
                      {p.barcode && (
                        <p className="font-mono text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Barcode className="w-3.5 h-3.5" /> {p.barcode}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-base text-slate-900 dark:text-white">
                        {formatCurrency(p.sale_price)}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        ISV: {p.tax_rate}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Stock:</span>
                      <span
                        className={`font-black px-2 py-0.5 rounded-full text-xs ${
                          isOut
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : isLow
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}
                      >
                        {p.stock} unid.
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop/Tablet Table */}
          <div className="card overflow-hidden hidden sm:block">
            <div className="table-container border-0">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Categoría / Marca</th>
                    <th className="text-right">Precio Costo</th>
                    <th className="text-right">Precio Venta</th>
                    <th className="text-center">ISV</th>
                    <th className="text-center">Stock</th>
                    <th className="text-center">Estado</th>
                    {isAdmin && <th className="text-center">Acciones</th>}
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
                          <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">
                              {p.name}
                            </p>
                            {p.barcode && (
                              <p className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                                <Barcode className="w-3 h-3" /> {p.barcode}
                              </p>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="space-y-0.5">
                            <span className="badge-gray text-[11px]">
                              {p.category?.name || 'Sin Categoría'}
                            </span>
                            {p.brand && (
                              <p className="text-[10px] text-slate-400 font-medium">
                                Marca: {p.brand.name}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="text-right font-mono text-xs text-slate-500">
                          {formatCurrency(p.cost_price)}
                        </td>
                        <td className="text-right font-mono font-black text-sm text-slate-900 dark:text-white">
                          {formatCurrency(p.sale_price)}
                        </td>
                        <td className="text-center font-mono text-xs font-semibold">
                          <span
                            className={
                              p.tax_rate === 0
                                ? 'text-slate-400'
                                : p.tax_rate === 18
                                ? 'text-purple-500 font-bold'
                                : 'text-sky-500'
                            }
                          >
                            {p.tax_rate}%
                          </span>
                        </td>
                        <td className="text-center font-mono">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
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
                        <td className="text-center">
                          <span className={p.is_active ? 'badge-green' : 'badge-red'}>
                            {p.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800"
                                title="Editar Producto"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                                title="Eliminar Producto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Product Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Código Interno *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PRD-0001"
                className="input-base font-mono uppercase font-bold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Código de Barra (EAN/UPC)</label>
              <div className="relative">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Escanea o escribe el código de barra..."
                  className="input-base pl-9 font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Nombre o Descripción del Producto *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Leche Sula Entera 1 Litro"
              className="input-base font-semibold"
            />
          </div>

          {/* Categoría, Marca, Proveedor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input-base"
              >
                <option value="">Sin Categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Marca</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="input-base"
              >
                <option value="">Sin Marca</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Proveedor</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="input-base"
              >
                <option value="">Sin Proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Precios e Impuesto ISV Honduras */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Precios e Impuestos (Honduras)
              </span>
              {marginPercent > 0 && (
                <span className="badge-green text-xs font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Margen: {marginPercent}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Precio de Costo (Lps)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="input-base font-mono font-bold"
                />
              </div>
              <div>
                <label className="label">Precio de Venta Final (Lps) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="input-base font-mono font-bold text-sky-600 dark:text-sky-400"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  (Incluye el impuesto ISV)
                </span>
              </div>
              <div>
                <label className="label">Tasa de ISV *</label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="input-base font-semibold"
                >
                  <option value="15">ISV General 15%</option>
                  <option value="18">ISV Licores/Tabaco 18%</option>
                  <option value="0">Exento de ISV 0%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stock y Mínimo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Existencia Actual (Stock) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="input-base font-mono font-bold"
              />
            </div>
            <div>
              <label className="label">Alerta Stock Mínimo *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="input-base font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="p_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500"
            />
            <label htmlFor="p_active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Producto Activo y Disponible para Venta en POS
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{editingProduct ? 'Guardar Cambios' : 'Registrar Producto'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar el producto "${deleteTarget?.name}"?`}
        confirmLabel="Eliminar Producto"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
