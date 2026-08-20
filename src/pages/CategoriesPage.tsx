import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'
import type { Category } from '@/types'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { Tags, Plus, Search, Edit2, Trash2, Loader2, CheckCircle2, XCircle, Package } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CategoriesPage() {
  const { activeBranchId, selectedBranchId } = useBranch()
  const [categories, setCategories] = useState<(Category & { product_count?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [selectedBranchId])

  const loadCategories = async () => {
    setLoading(true)
    try {
      let catQuery = supabase.from('categories').select('*').order('name')
      let prodQuery = supabase.from('products').select('category_id, id').eq('is_active', true)

      // Filtrar por sucursal activa
      if (selectedBranchId) {
        catQuery = catQuery.or(`branch_id.eq.${selectedBranchId},branch_id.is.null`)
        prodQuery = prodQuery.eq('branch_id', selectedBranchId)
      }

      const [catRes, prodRes] = await Promise.all([catQuery, prodQuery])

      if (catRes.error) throw catRes.error

      const counts: Record<number, number> = {}
      ;(prodRes.data || []).forEach((p) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1
        }
      })

      const withCounts = (catRes.data || []).map((c) => ({
        ...c,
        product_count: counts[c.id] || 0,
      }))

      setCategories(withCounts)
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar categorías')
    } finally {
      setLoading(false)
    }
  }


  const openCreate = () => {
    setEditingCategory(null)
    setName('')
    setIsActive(true)
    setIsModalOpen(true)
  }

  const openEdit = (c: Category) => {
    setEditingCategory(c)
    setName(c.name)
    setIsActive(c.is_active)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('El nombre de la categoría es requerido')
      return
    }

    setSaving(true)
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ name: name.trim(), is_active: isActive })
          .eq('id', editingCategory.id)

        if (error) throw error
        toast.success('Categoría actualizada exitosamente')
      } else {
        const { error } = await supabase.from('categories').insert({
          name: name.trim(),
          is_active: isActive,
          branch_id: activeBranchId,
        })

        if (error) throw error
        toast.success('Categoría creada exitosamente')
      }

      setIsModalOpen(false)
      loadCategories()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar categoría')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      // Intentar borrado real, si tiene productos asociados hacer soft delete
      const { error: hardErr } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteTarget.id)

      if (hardErr) {
        // Soft delete como alternativa si hay productos vinculados
        const { error: softErr } = await supabase
          .from('categories')
          .update({ is_active: false })
          .eq('id', deleteTarget.id)

        if (softErr) throw softErr
        toast.success('Categoría desactivada (tiene productos asociados)')
      } else {
        toast.success('Categoría eliminada permanentemente')
      }

      setDeleteTarget(null)
      loadCategories()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar categoría')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Tags className="w-7 h-7 text-sky-500" />
            Categorías de Productos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Organiza tus productos por departamentos o tipos de mercadería
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" />
          <span>Nueva Categoría</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoría por nombre..."
            className="input-base pl-10 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonTable rows={5} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No se encontraron categorías"
            description="Crea tu primera categoría para organizar tus productos en el POS e Inventario."
            action={
              <button onClick={openCreate} className="btn-primary text-xs">
                <Plus className="w-4 h-4" /> Agregar Categoría
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile View: Cards */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filtered.map((c) => (
              <div key={c.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {c.name}
                    </span>
                    <span className={c.is_active ? 'badge-green' : 'badge-red'}>
                      {c.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    {c.product_count} productos asociados
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-2 rounded-lg text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/Tablet View: Table */}
          <div className="card overflow-hidden hidden sm:block">
            <div className="table-container border-0">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre de Categoría</th>
                    <th>Productos Activos</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono text-xs text-slate-400">#{c.id}</td>
                      <td>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {c.name}
                        </p>
                      </td>
                      <td>
                        <span className="badge-gray text-xs font-semibold">
                          <Package className="w-3 h-3 inline mr-1 text-slate-400" />
                          {c.product_count} productos
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={c.is_active ? 'badge-green' : 'badge-red'}>
                          {c.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800"
                            title="Editar Categoría"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                            title="Eliminar Categoría"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Create / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nombre de la Categoría *</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Lácteos, Granos Básicos, Limpieza..."
              className="input-base font-semibold"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="c_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500"
            />
            <label htmlFor="c_active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Categoría Activa (Visible en POS)
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
              <span>{editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Categoría"
        message={`¿Estás seguro de que deseas eliminar la categoría "${deleteTarget?.name}"?`}
        confirmLabel="Eliminar Categoría"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
