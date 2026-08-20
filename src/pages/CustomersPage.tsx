import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'
import { formatCurrency, formatDateTime } from '@/utils'
import type { Customer, Sale } from '@/types'
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
  Phone,
  MapPin,
  History,
  Receipt,
  Loader2,
  DollarSign,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function CustomersPage() {
  const { activeBranchId, selectedBranchId } = useBranch()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debtFilter, setDebtFilter] = useState<'all' | 'debt_only'>('all')

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [name, setName] = useState('')
  const [rtn, setRtn] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [debt, setDebt] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Purchase History Modal
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)
  const [customerSales, setCustomerSales] = useState<Sale[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [selectedBranchId])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .order('id', { ascending: true })

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query

      if (error) throw error
      setCustomers(data || [])
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }


  const openCreate = () => {
    setEditingCustomer(null)
    setName('')
    setRtn('')
    setPhone('')
    setAddress('')
    setDebt('0')
    setIsActive(true)
    setIsModalOpen(true)
  }

  const openEdit = (c: Customer) => {
    setEditingCustomer(c)
    setName(c.name)
    setRtn(c.rtn || '')
    setPhone(c.phone || '')
    setAddress(c.address || '')
    setDebt(String(c.debt || 0))
    setIsActive(c.is_active)
    setIsModalOpen(true)
  }

  const openHistory = async (c: Customer) => {
    setHistoryCustomer(c)
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, profile:profiles(full_name)')
        .eq('customer_id', c.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setCustomerSales((data as unknown as Sale[]) || [])
    } catch (err: any) {
      toast.error('Error al cargar historial de compras')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('El nombre del cliente es requerido')
      return
    }

    const debtVal = parseFloat(debt) || 0
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        rtn: rtn.trim(),
        phone: phone.trim(),
        address: address.trim(),
        debt: debtVal,
        branch_id: activeBranchId,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', editingCustomer.id)

        if (error) throw error
        toast.success('Cliente actualizado exitosamente')
      } else {
        const { error: insertErr } = await supabase.from('customers').insert(payload)
        if (insertErr) {
          // If sequence is out of sync in PostgreSQL, calculate next ID manually
          const { data: maxRow } = await supabase
            .from('customers')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle()

          const nextId = (maxRow?.id ? Number(maxRow.id) : 1) + 1
          const { error: retryErr } = await supabase.from('customers').insert({
            ...payload,
            id: nextId,
          })
          if (retryErr) throw retryErr
        }
        toast.success('Cliente registrado exitosamente')
      }

      setIsModalOpen(false)
      loadCustomers()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar cliente')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.id === 1) {
      toast.error('No se puede eliminar el cliente Consumidor Final')
      setDeleteTarget(null)
      return
    }

    setDeleting(true)
    try {
      const { error: hardErr } = await supabase
        .from('customers')
        .delete()
        .eq('id', deleteTarget.id)

      if (hardErr) {
        const { error: softErr } = await supabase
          .from('customers')
          .update({ is_active: false })
          .eq('id', deleteTarget.id)

        if (softErr) throw softErr
        toast.success('Cliente desactivado')
      } else {
        toast.success('Cliente eliminado')
      }

      setDeleteTarget(null)
      loadCustomers()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar cliente')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      (c.rtn && c.rtn.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))

    const matchDebt = debtFilter === 'all' || (debtFilter === 'debt_only' && c.debt > 0)
    return matchSearch && matchDebt
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-sky-500" />
            Clientes & Cuentas por Cobrar
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Control de clientes, facturación con RTN e historial de crédito
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" />
          <span>Nuevo Cliente</span>
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
              placeholder="Buscar cliente por nombre, RTN o teléfono..."
              className="input-base pl-10 text-sm"
            />
          </div>
          <div className="sm:col-span-4">
            <select
              value={debtFilter}
              onChange={(e) => setDebtFilter(e.target.value as any)}
              className="input-base text-sm font-medium"
            >
              <option value="all">Todos los Clientes</option>
              <option value="debt_only">🔴 Solo con Deuda Pendiente</option>
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
            title="No se encontraron clientes"
            description="Registra clientes para compras a crédito o con datos de facturación SAR."
            action={
              <button onClick={openCreate} className="btn-primary text-xs">
                <Plus className="w-4 h-4" /> Agregar Cliente
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filtered.map((c) => (
              <div key={c.id} className="card p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {c.name}
                    </h3>
                    {c.rtn && (
                      <p className="font-mono text-xs text-slate-400">RTN: {c.rtn}</p>
                    )}
                  </div>
                  {c.debt > 0 ? (
                    <span className="badge-red text-xs font-black">
                      Debe: {formatCurrency(c.debt)}
                    </span>
                  ) : (
                    <span className="badge-green text-xs">Al día</span>
                  )}
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                  {c.phone && (
                    <p className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`tel:${c.phone}`} className="text-sky-500">
                        {c.phone}
                      </a>
                    </p>
                  )}
                  {c.address && (
                    <p className="flex items-center gap-1.5 text-slate-400 truncate">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => openHistory(c)}
                    className="text-xs text-sky-500 font-semibold flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5" /> Historial
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {c.id !== 1 && (
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
                    <th>Nombre de Cliente</th>
                    <th>RTN</th>
                    <th>Teléfono</th>
                    <th>Dirección</th>
                    <th className="text-right">Saldo Deudor</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {c.name}
                        </p>
                        {c.id === 1 && (
                          <span className="text-[10px] text-sky-500 font-bold uppercase">
                            Predeterminado
                          </span>
                        )}
                      </td>
                      <td className="font-mono text-xs text-slate-500">
                        {c.rtn || '-'}
                      </td>
                      <td className="font-mono text-xs">
                        {c.phone ? (
                          <a href={`tel:${c.phone}`} className="text-sky-500 hover:underline">
                            {c.phone}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-xs text-slate-500 max-w-xs truncate">
                        {c.address || '-'}
                      </td>
                      <td className="text-right font-mono font-bold">
                        {c.debt > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-black">
                            {formatCurrency(c.debt)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Lps 0.00</span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className={c.is_active ? 'badge-green' : 'badge-red'}>
                          {c.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openHistory(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800"
                            title="Ver Historial de Compras"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800"
                            title="Editar Cliente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {c.id !== 1 && (
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                              title="Eliminar Cliente"
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nombre Completo o Razón Social *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. María Antonia López"
              className="input-base font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">RTN Fiscal (Opcional)</label>
              <input
                type="text"
                value={rtn}
                onChange={(e) => setRtn(e.target.value)}
                placeholder="08011990123456"
                className="input-base font-mono"
              />
            </div>
            <div>
              <label className="label">Teléfono / Celular</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+504 9900-0000"
                className="input-base font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Dirección</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Barrio, Calle, Referencia..."
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="label">Saldo Deuda Inicial (Lps)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={debt}
                onChange={(e) => setDebt(e.target.value)}
                placeholder="0.00"
                className="input-base font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="cust_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500"
            />
            <label htmlFor="cust_active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Cliente Activo (Habilitado para Facturación)
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
              <span>{editingCustomer ? 'Guardar Cambios' : 'Registrar Cliente'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={historyCustomer !== null}
        onClose={() => setHistoryCustomer(null)}
        title={`Historial de Compras: ${historyCustomer?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <p className="text-slate-400">RTN: {historyCustomer?.rtn || 'N/A'}</p>
              <p className="text-slate-400">Tel: {historyCustomer?.phone || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400">Saldo Pendiente:</p>
              <p className={`font-black text-sm ${historyCustomer && historyCustomer.debt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {formatCurrency(historyCustomer?.debt || 0)}
              </p>
            </div>
          </div>

          {loadingHistory ? (
            <SkeletonTable rows={4} />
          ) : customerSales.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">
              Este cliente no tiene compras registradas en el sistema.
            </p>
          ) : (
            <div className="table-container max-h-72 overflow-y-auto">
              <table className="table-base text-xs">
                <thead>
                  <tr>
                    <th>Factura</th>
                    <th>Fecha</th>
                    <th>Método</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {customerSales.map((s) => (
                    <tr key={s.id}>
                      <td className="font-mono font-bold text-sky-500">{s.invoice_number}</td>
                      <td className="text-slate-500">{formatDateTime(s.created_at)}</td>
                      <td>
                        <span className="badge-gray text-[10px]">{s.payment_method}</span>
                      </td>
                      <td className="text-right font-black">{formatCurrency(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setHistoryCustomer(null)}
              className="btn-secondary text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Cliente"
        message={`¿Estás seguro de que deseas eliminar a "${deleteTarget?.name}"?`}
        confirmLabel="Eliminar Cliente"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
