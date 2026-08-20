import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import type { Profile, UserRole } from '@/types'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building2,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const { profile: currentProfile, isSuperAdmin } = useAuth()
  const { branches, selectedBranchId, activeBranchId } = useBranch()

  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // Modal Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('cashier')
  const [branchId, setBranchId] = useState<string>('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Delete/Deactivate
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadUsersList()
  }, [selectedBranchId])

  const loadUsersList = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('*, branch:branches(*)')
        .order('created_at', { ascending: false })

      if (!isSuperAdmin && currentProfile?.branch_id) {
        query = query.eq('branch_id', currentProfile.branch_id)
      } else if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query
      if (error) throw error
      setUsers((data as unknown as Profile[]) || [])
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingUser(null)
    setUsername('')
    setFullName('')
    setRole('cashier')
    setBranchId(activeBranchId)
    setPassword('')
    setIsActive(true)
    setIsModalOpen(true)
  }

  const openEdit = (u: Profile) => {
    setEditingUser(u)
    setUsername(u.username)
    setFullName(u.full_name)
    setRole(u.role)
    setBranchId(u.branch_id || activeBranchId)
    setPassword('')
    setIsActive(u.is_active)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUser = username.trim().toLowerCase()
    if (!cleanUser || !fullName.trim()) {
      toast.error('Usuario y Nombre completo son requeridos')
      return
    }

    if (!editingUser && (!password || password.length < 6)) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSaving(true)
    try {
      if (editingUser) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
            role,
            branch_id: role === 'super_admin' ? null : branchId || activeBranchId,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingUser.id)

        if (profileErr) throw profileErr
        toast.success('Usuario actualizado exitosamente')
      } else {
        const email = `${cleanUser}@mercasmart.com`
        const targetBranch = role === 'super_admin' ? null : branchId || activeBranchId

        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: cleanUser,
              full_name: fullName.trim(),
              role,
              branch_id: targetBranch,
            },
          },
        })

        if (authErr) throw authErr

        if (authData.user) {
          await supabase.from('profiles').upsert(
            {
              id: authData.user.id,
              username: cleanUser,
              full_name: fullName.trim(),
              role,
              branch_id: targetBranch,
              is_active: isActive,
            },
            { onConflict: 'id' }
          )
        }

        toast.success('Usuario creado exitosamente')
      }

      setIsModalOpen(false)
      loadUsersList()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar usuario')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteTarget.id)

      if (error) {
        // Fallback to deactivate if has foreign keys (sales, cash sessions)
        await supabase
          .from('profiles')
          .update({ is_active: false })
          .eq('id', deleteTarget.id)
        toast.success('Usuario desactivado')
      } else {
        toast.success('Usuario eliminado')
      }

      setDeleteTarget(null)
      loadUsersList()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar usuario')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (u: Profile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !u.is_active })
        .eq('id', u.id)

      if (error) throw error
      toast.success(u.is_active ? 'Usuario desactivado' : 'Usuario activado')
      loadUsersList()
    } catch (err) {
      toast.error('Error al cambiar estado')
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    const matchesSearch =
      u.full_name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)

    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-sky-500" />
            Usuarios & Personal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isSuperAdmin
              ? 'Administra Super Admins, Administradores de Sucursal y Cajeros'
              : 'Administra los Cajeros asignados a tu sucursal'}
          </p>
        </div>

        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o usuario..."
              className="input-base pl-10 text-sm"
            />
          </div>
          <div className="sm:col-span-4">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-base text-sm"
            >
              <option value="all">Todos los Roles</option>
              {isSuperAdmin && <option value="super_admin">Super Admin</option>}
              <option value="admin">Administrador</option>
              <option value="cashier">Cajero</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonTable rows={5} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No se encontraron usuarios"
            description="Agrega nuevos usuarios para asignar cajeros o administradores."
            action={
              <button onClick={openCreate} className="btn-primary text-xs">
                <Plus className="w-4 h-4" /> Agregar Usuario
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filtered.map((u) => {
              const roleBadge =
                u.role === 'super_admin'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : u.role === 'admin'
                  ? 'badge-blue'
                  : 'badge-green'

              return (
                <div key={u.id} className="card p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-sky-500">
                        @{u.username}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {u.full_name}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadge}`}
                    >
                      {u.role === 'super_admin'
                        ? 'Super Admin'
                        : u.role === 'admin'
                        ? 'Admin'
                        : 'Cajero'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Building2 className="w-3.5 h-3.5" />
                      {u.role === 'super_admin'
                        ? 'Global'
                        : u.branch?.name || 'Sucursal Principal'}
                    </span>
                    <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => openEdit(u)}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    {u.id !== currentProfile?.id && (
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
                    <th>Usuario</th>
                    <th>Nombre Completo</th>
                    <th>Rol</th>
                    <th>Sucursal Asignada</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const roleBadge =
                      u.role === 'super_admin'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : u.role === 'admin'
                        ? 'badge-blue'
                        : 'badge-green'

                    return (
                      <tr key={u.id}>
                        <td>
                          <span className="font-mono text-xs font-bold text-sky-500">
                            @{u.username}
                          </span>
                        </td>
                        <td>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">
                            {u.full_name}
                          </p>
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${roleBadge}`}
                          >
                            {u.role === 'super_admin'
                              ? 'Super Admin'
                              : u.role === 'admin'
                              ? 'Administrador'
                              : 'Cajero'}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {u.role === 'super_admin'
                              ? 'Todas (Global)'
                              : u.branch?.name || 'Sucursal Principal'}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                            {u.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEdit(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {u.id !== currentProfile?.id && (
                              <>
                                <button
                                  onClick={() => handleToggleActive(u)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    u.is_active
                                      ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800'
                                      : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-800'
                                  }`}
                                  title={u.is_active ? 'Desactivar' : 'Activar'}
                                >
                                  {u.is_active ? (
                                    <XCircle className="w-4 h-4" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(u)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Usuario (Login) *</label>
              <input
                type="text"
                required
                disabled={!!editingUser}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="ej. cajero1"
                className="input-base font-mono disabled:opacity-60"
              />
            </div>

            <div>
              <label className="label">Nombre Completo *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ej. Juan Carlos Pérez"
                className="input-base font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Rol del Usuario *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="input-base"
              >
                <option value="cashier">Cajero (POS y Caja)</option>
                <option value="admin">Administrador de Sucursal</option>
                {isSuperAdmin && <option value="super_admin">Super Administrador (Global)</option>}
              </select>
            </div>

            {role !== 'super_admin' && (
              <div>
                <label className="label">Sucursal Asignada *</label>
                <select
                  disabled={!isSuperAdmin}
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="input-base disabled:opacity-60"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!editingUser && (
            <div>
              <label className="label">Contraseña Inicial *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="input-base pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="u_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500"
            />
            <label htmlFor="u_active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Usuario Activo y Habilitado para Iniciar Sesión
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
              <span>{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</span>
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario "${deleteTarget?.full_name}"?`}
        confirmLabel="Eliminar Usuario"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
