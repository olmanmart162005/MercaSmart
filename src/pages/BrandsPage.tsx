import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Brand } from '@/types'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { Award, Plus, Search, Edit2, Trash2, Loader2, Package } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BrandsPage() {
  const [brands, setBrands] = useState<(Brand & { product_count?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadBrands()
  }, [])

  const loadBrands = async () => {
    setLoading(true)
    try {
      const [brandRes, prodRes] = await Promise.all([
        supabase.from('brands').select('*').order('name'),
        supabase.from('products').select('brand_id, id').eq('is_active', true),
      ])

      if (brandRes.error) throw brandRes.error

      const counts: Record<number, number> = {}
      ;(prodRes.data || []).forEach((p) => {
        if (p.brand_id) {
          counts[p.brand_id] = (counts[p.brand_id] || 0) + 1
        }
      })

      const withCounts = (brandRes.data || []).map((b) => ({
        ...b,
        product_count: counts[b.id] || 0,
      }))

      setBrands(withCounts)
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar marcas')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingBrand(null)
    setName('')
    setIsActive(true)
    setIsModalOpen(true)
  }

  const openEdit = (b: Brand) => {
    setEditingBrand(b)
    setName(b.name)
    setIsActive(b.is_active)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('El nombre de la marca es requerido')
      return
    }

    setSaving(true)
    try {
      if (editingBrand) {
        const { error } = await supabase
          .from('brands')
          .update({ name: name.trim(), is_active: isActive })
          .eq('id', editingBrand.id)

        if (error) throw error
        toast.success('Marca actualizada')
      } else {
        const payload = { name: name.trim(), is_active: isActive }
        const { error: insertErr } = await supabase.from('brands').insert(payload)
        if (insertErr) {
          const { data: maxRow } = await supabase
            .from('brands')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle()

          const nextId = (maxRow?.id ? Number(maxRow.id) : 1) + 1
          const { error: retryErr } = await supabase.from('brands').insert({
            ...payload,
            id: nextId,
          })
          if (retryErr) throw retryErr
        }
        toast.success('Marca creada exitosamente')
      }

      setIsModalOpen(false)
      loadBrands()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar marca')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error: hardErr } = await supabase
        .from('brands')
        .delete()
        .eq('id', deleteTarget.id)

      if (hardErr) {
        const { error: softErr } = await supabase
          .from('brands')
          .update({ is_active: false })
          .eq('id', deleteTarget.id)

        if (softErr) throw softErr
        toast.success('Marca desactivada')
      } else {
        toast.success('Marca eliminada')
      }

      setDeleteTarget(null)
      loadBrands()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar marca')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Award className="w-7 h-7 text-sky-500" />
            Marcas Comerciales
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra las marcas de los productos distribuidos
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" />
          <span>Nueva Marca</span>
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar marca..."
            className="input-base pl-10 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonTable rows={4} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No se encontraron marcas"
            description="Registra marcas para clasificar tus productos."
            action={
              <button onClick={openCreate} className="btn-primary text-xs">
                <Plus className="w-4 h-4" /> Agregar Marca
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filtered.map((b) => (
              <div key={b.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {b.name}
                    </span>
                    <span className={b.is_active ? 'badge-green' : 'badge-red'}>
                      {b.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    {b.product_count} productos asociados
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(b)}
                    className="p-2 rounded-lg text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b)}
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="card overflow-hidden hidden sm:block">
            <div className="table-container border-0">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre de Marca</th>
                    <th>Productos Activos</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id}>
                      <td className="font-mono text-xs text-slate-400">#{b.id}</td>
                      <td>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {b.name}
                        </p>
                      </td>
                      <td>
                        <span className="badge-gray text-xs font-semibold">
                          <Package className="w-3 h-3 inline mr-1 text-slate-400" />
                          {b.product_count} productos
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={b.is_active ? 'badge-green' : 'badge-red'}>
                          {b.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                            title="Eliminar"
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBrand ? 'Editar Marca' : 'Nueva Marca'}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nombre de la Marca *</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Coca-Cola, Bimbo, Leyde..."
              className="input-base font-semibold"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="b_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500"
            />
            <label htmlFor="b_active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Marca Activa
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
              <span>{editingBrand ? 'Guardar Cambios' : 'Crear Marca'}</span>
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Marca"
        message={`¿Estás seguro de que deseas eliminar la marca "${deleteTarget?.name}"?`}
        confirmLabel="Eliminar Marca"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
