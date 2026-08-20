import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'
import type { Supplier } from '@/types'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { Truck, Plus, Search, Edit2, Trash2, Phone, MapPin, User, Loader2, Building } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SuppliersPage() {
  const { activeBranchId, selectedBranchId } = useBranch()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [rtn, setRtn] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [promotor, setPromotor] = useState('')
  const [promotorPhone, setPromotorPhone] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadSuppliers()
  }, [selectedBranchId])

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      let query = supabase.from('suppliers').select('*').order('name')

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query

      if (error) throw error
      setSuppliers(data || [])
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar proveedores')
    } finally {
      setLoading(false)
    }
  }


  const openCreate = () => {
    setEditingSupplier(null)
    setName('')
    setRtn('')
    setPhone('')
    setAddress('')
    setPromotor('')
    setPromotorPhone('')
    setIsActive(true)
    setIsModalOpen(true)
  }

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s)
    setName(s.name)
    setRtn(s.rtn || '')
    setPhone(s.phone || '')
    setAddress(s.address || '')
    setPromotor(s.promotor || '')
    setPromotorPhone(s.promotor_phone || '')
    setIsActive(s.is_active)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('El nombre del proveedor es requerido')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        rtn: rtn.trim(),
        phone: phone.trim(),
        address: address.trim(),
        promotor: promotor.trim(),
        promotor_phone: promotorPhone.trim(),
        branch_id: activeBranchId,
        is_active: isActive,
      }

      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(payload)
          .eq('id', editingSupplier.id)

        if (error) throw error
        toast.success('Proveedor actualizado exitosamente')
      } else {
        const { error: insertErr } = await supabase.from('suppliers').insert(payload)
        if (insertErr) {
          const { data: maxRow } = await supabase
            .from('suppliers')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle()

          const nextId = (maxRow?.id ? Number(maxRow.id) : 1) + 1
          const { error: retryErr } = await supabase.from('suppliers').insert({
            ...payload,
            id: nextId,
          })
          if (retryErr) throw retryErr
        }
        toast.success('Proveedor registrado exitosamente')
      }

      setIsModalOpen(false)
      loadSuppliers()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar proveedor')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error: hardErr } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', deleteTarget.id)

      if (hardErr) {
        const { error: softErr } = await supabase
          .from('suppliers')
          .update({ is_active: false })
          .eq('id', deleteTarget.id)

        if (softErr) throw softErr
        toast.success('Proveedor desactivado')
      } else {
        toast.success('Proveedor eliminado permanentemente')
      }

      setDeleteTarget(null)
      loadSuppliers()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar proveedor')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.rtn && s.rtn.toLowerCase().includes(q)) ||
      (s.promotor && s.promotor.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-sky-500" />
            Proveedores & Distribuidores
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Directorio de distribuidores, agentes de venta y datos fiscales
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" />
          <span>Nuevo Proveedor</span>
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
            placeholder="Buscar por empresa, RTN o nombre del agente..."
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
            title="No se encontraron proveedores"
            description="Registra proveedores para asociar compras e inventarios."
            action={
              <button onClick={openCreate} className="btn-primary text-xs">
                <Plus className="w-4 h-4" /> Agregar Proveedor
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filtered.map((s) => (
              <div key={s.id} className="card p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {s.name}
                    </h3>
                    {s.rtn && (
                      <p className="font-mono text-xs text-slate-400">RTN: {s.rtn}</p>
                    )}
                  </div>
                  <span className={s.is_active ? 'badge-green' : 'badge-red'}>
                    {s.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                  {s.promotor && (
                    <p className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Agente: {s.promotor}</span>
                      {s.promotor_phone && (
                        <a href={`tel:${s.promotor_phone}`} className="text-sky-500 font-mono ml-auto">
                          {s.promotor_phone}
                        </a>
                      )}
                    </p>
                  )}
                  {s.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`tel:${s.phone}`} className="text-sky-500 font-mono">
                        {s.phone}
                      </a>
                    </p>
                  )}
                  {s.address && (
                    <p className="flex items-center gap-1.5 text-slate-400 truncate">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{s.address}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => openEdit(s)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                    title="Eliminar"
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
                    <th>Empresa / Proveedor</th>
                    <th>RTN Fiscal</th>
                    <th>Teléfono</th>
                    <th>Agente / Vendedor</th>
                    <th>Dirección</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {s.name}
                        </p>
                      </td>
                      <td className="font-mono text-xs text-slate-500">
                        {s.rtn || '-'}
                      </td>
                      <td className="font-mono text-xs">
                        {s.phone ? (
                          <a href={`tel:${s.phone}`} className="text-sky-500 hover:underline">
                            {s.phone}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-xs">
                        {s.promotor ? (
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {s.promotor}
                            </p>
                            {s.promotor_phone && (
                              <p className="font-mono text-[11px] text-slate-400">
                                {s.promotor_phone}
                              </p>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-xs text-slate-500 max-w-xs truncate">
                        {s.address || '-'}
                      </td>
                      <td className="text-center">
                        <span className={s.is_active ? 'badge-green' : 'badge-red'}>
                          {s.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800"
                            title="Editar Proveedor"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                            title="Eliminar Proveedor"
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
        title={editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre de la Empresa *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Distribuidora Sula, Dinant..."
                className="input-base font-semibold"
              />
            </div>
            <div>
              <label className="label">RTN Fiscal</label>
              <input
                type="text"
                value={rtn}
                onChange={(e) => setRtn(e.target.value)}
                placeholder="08011990123456"
                className="input-base font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Teléfono de la Empresa</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+504 2200-0000"
                className="input-base font-mono"
              />
            </div>
            <div>
              <label className="label">Dirección / Ciudad</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Tegucigalpa, San Pedro Sula..."
                className="input-base text-sm"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Datos del Promotor o Agente de Ventas
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre del Agente</label>
                <input
                  type="text"
                  value={promotor}
                  onChange={(e) => setPromotor(e.target.value)}
                  placeholder="ej. Carlos Rodríguez"
                  className="input-base text-sm"
                />
              </div>
              <div>
                <label className="label">Celular del Agente</label>
                <input
                  type="text"
                  value={promotorPhone}
                  onChange={(e) => setPromotorPhone(e.target.value)}
                  placeholder="+504 9900-0000"
                  className="input-base font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="s_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500"
            />
            <label htmlFor="s_active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Proveedor Activo
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
              <span>{editingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}</span>
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Proveedor"
        message={`¿Estás seguro de que deseas eliminar a "${deleteTarget?.name}"?`}
        confirmLabel="Eliminar Proveedor"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
