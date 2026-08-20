import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import type { Branch } from '@/types'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
  Upload,
  ImageIcon
} from 'lucide-react'
import toast from 'react-hot-toast'

const SUPABASE_URL = 'https://dyfwcubkvgcqufpmtgvh.supabase.co'

export default function BranchesPage() {
  const { isSuperAdmin } = useAuth()
  const { reloadBranches } = useBranch()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [rtn, setRtn] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Toggle/Delete State
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadBranchesList()
  }, [])

  const loadBranchesList = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setBranches((data as Branch[]) || [])
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar sucursales')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingBranch(null)
    const nextCode = `SUC-${String(branches.length + 1).padStart(3, '0')}`
    setCode(nextCode)
    setName('')
    setAddress('')
    setPhone('')
    setRtn('')
    setLogoUrl('')
    setLogoFile(null)
    setLogoPreview('')
    setIsActive(true)
    setIsModalOpen(true)
  }

  const openEdit = (b: Branch) => {
    setEditingBranch(b)
    setCode(b.code)
    setName(b.name)
    setAddress(b.address || '')
    setPhone(b.phone || '')
    setRtn((b as any).rtn || '')
    setLogoUrl((b as any).logo_url || '')
    setLogoFile(null)
    setLogoPreview((b as any).logo_url || '')
    setIsActive(b.is_active)
    setIsModalOpen(true)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no puede superar 2MB')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) {
      toast.error('Código y Nombre de la sucursal son requeridos')
      return
    }

    setSaving(true)
    try {
      let finalLogoUrl = logoUrl

      // Upload logo if a new file was selected
      if (logoFile) {
        setUploadingLogo(true)
        const ext = logoFile.name.split('.').pop()
        const path = `${code.trim().toLowerCase()}/logo.${ext}`
        const { error: upErr } = await supabase.storage
          .from('branch-logos')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type })

        if (upErr) {
          toast.error('Error al subir el logo: ' + upErr.message)
        } else {
          finalLogoUrl = `${SUPABASE_URL}/storage/v1/object/public/branch-logos/${path}`
        }
        setUploadingLogo(false)
      }

      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        rtn: rtn.trim(),
        logo_url: finalLogoUrl || null,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }

      if (editingBranch) {
        const { error } = await supabase
          .from('branches')
          .update(payload)
          .eq('id', editingBranch.id)
        if (error) throw error
        toast.success('Sucursal actualizada')
      } else {
        const { error } = await supabase.from('branches').insert(payload)
        if (error) throw error
        toast.success('Sucursal creada exitosamente')
      }

      setIsModalOpen(false)
      loadBranchesList()
      reloadBranches()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar sucursal')
    } finally {
      setSaving(false)
    }
  }


  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error: hardErr } = await supabase
        .from('branches')
        .delete()
        .eq('id', deleteTarget.id)

      if (hardErr) {
        const { error: softErr } = await supabase
          .from('branches')
          .update({ is_active: false })
          .eq('id', deleteTarget.id)

        if (softErr) throw softErr
        toast.success('Sucursal desactivada')
      } else {
        toast.success('Sucursal eliminada')
      }

      setDeleteTarget(null)
      loadBranchesList()
      reloadBranches()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar sucursal')
    } finally {
      setDeleting(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-12 text-center card">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          Acceso Restringido
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Solo el Super Administrador puede gestionar sucursales.
        </p>
      </div>
    )
  }

  const filtered = branches.filter((b) => {
    const q = search.toLowerCase()
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      (b.address && b.address.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-sky-500" />
            Administración de Sucursales
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Control de locales físicos, puntos de venta y asignación de personal
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" />
          <span>Nueva Sucursal</span>
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
            placeholder="Buscar sucursal por nombre o código..."
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
            title="No se encontraron sucursales"
            description="Crea sucursales para habilitar la operación multi-tienda de MercaSmart."
            action={
              <button onClick={openCreate} className="btn-primary text-xs">
                <Plus className="w-4 h-4" /> Agregar Sucursal
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filtered.map((b) => (
              <div key={b.id} className="card p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                      {b.code}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                      {b.name}
                    </h3>
                  </div>
                  <span className={b.is_active ? 'badge-green' : 'badge-red'}>
                    {b.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                  {b.address && (
                    <p className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{b.address}</span>
                    </p>
                  )}
                  {b.phone && (
                    <p className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`tel:${b.phone}`} className="text-sky-500">
                        {b.phone}
                      </a>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => openEdit(b)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  {b.code !== 'SUC-001' && (
                    <button
                      onClick={() => setDeleteTarget(b)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
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
                    <th>Código</th>
                    <th>Nombre de Sucursal</th>
                    <th>Dirección</th>
                    <th>Teléfono</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2 py-1 rounded-md border border-sky-200 dark:border-sky-800">
                          {b.code}
                        </span>
                      </td>
                      <td>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {b.name}
                        </p>
                      </td>
                      <td className="text-xs text-slate-500 max-w-xs truncate">
                        {b.address || '-'}
                      </td>
                      <td className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {b.phone || '-'}
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
                          {b.code !== 'SUC-001' && (
                            <button
                              onClick={() => setDeleteTarget(b)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
        title={editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Código *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SUC-002"
                className="input-base font-mono uppercase font-bold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Nombre de la Sucursal *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Pulpería El Centro, Sucursal Kennedy"
                className="input-base font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="label">Dirección Física</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Barrio, Calle, Referencia..."
              className="input-base text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Teléfono de Contacto</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+504 2200-0000"
                className="input-base font-mono text-sm"
              />
            </div>
            <div>
              <label className="label">RTN (Registro Tributario)</label>
              <input
                type="text"
                value={rtn}
                onChange={(e) => setRtn(e.target.value)}
                placeholder="0101-1990-00001"
                className="input-base font-mono text-sm"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="label">Logo de la Sucursal</label>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="btn-secondary text-xs py-1.5 w-full"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {logoPreview ? 'Cambiar Logo' : 'Subir Logo'}
                </button>
                <p className="text-[10px] text-slate-400 mt-1">JPG, PNG o SVG · Máx 2MB</p>
              </div>
            </div>
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
              Sucursal Activa y Operativa
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving || uploadingLogo} className="btn-primary">
              {saving || uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{editingBranch ? 'Guardar Cambios' : 'Crear Sucursal'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Sucursal"
        message={`¿Deseas eliminar o desactivar la sucursal "${deleteTarget?.name}"?`}
        confirmLabel="Eliminar Sucursal"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
