import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import { formatCurrency, formatDateTime } from '@/utils'
import type { CashSession, CashMovement, Sale } from '@/types'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import {
  DollarSign,
  Lock,
  Unlock,
  PlusCircle,
  MinusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Calculator,
  User,
  Loader2,
  FileSpreadsheet
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function CashPage() {
  const { profile, isSuperAdmin, isAdmin, isCajero } = useAuth()
  const { selectedBranchId, activeBranchId, selectedBranch } = useBranch()
  const [activeSession, setActiveSession] = useState<CashSession | null>(null)
  const [sessionSales, setSessionSales] = useState<Sale[]>([])
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [allSessions, setAllSessions] = useState<CashSession[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false)
  const [initialAmount, setInitialAmount] = useState('0.00')

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [countedAmount, setCountedAmount] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [closing, setClosing] = useState(false)

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
  const [movementType, setMovementType] = useState<'income' | 'expense'>('expense')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementDesc, setMovementDesc] = useState('')
  const [savingMovement, setSavingMovement] = useState(false)

  useEffect(() => {
    loadCashData()
  }, [])

  const loadCashData = async () => {
    setLoading(true)
    try {
      if (!profile?.id) return

      // 1. Current user active session
      const { data: currentSession } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'open')
        .maybeSingle()

      setActiveSession(currentSession as CashSession | null)

      if (currentSession) {
        // Load sales for this session
        const [salesRes, movRes] = await Promise.all([
          supabase
            .from('sales')
            .select('*')
            .eq('cash_session_id', currentSession.id)
            .eq('is_cancelled', false)
            .order('created_at', { ascending: false }),
          supabase
            .from('cash_movements')
            .select('*')
            .eq('session_id', currentSession.id)
            .order('created_at', { ascending: false }),
        ])
        if (salesRes.data) setSessionSales(salesRes.data as Sale[])
        if (movRes.data) setMovements(movRes.data as CashMovement[])
      }

      // 2. Load all past sessions for history
      let query = supabase
        .from('cash_sessions')
        .select('*, profile:profiles(full_name, username), branch:branches(name)')
        .order('opened_at', { ascending: false })
        .limit(30)

      if (isCajero) {
        query = query.eq('user_id', profile.id)
      } else if (!isSuperAdmin && profile.branch_id) {
        query = query.eq('branch_id', profile.branch_id)
      } else if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data: historyData } = await query
      if (historyData) setAllSessions(historyData as unknown as CashSession[])
    } catch (err) {
      toast.error('Error al cargar datos de caja')
    } finally {
      setLoading(false)
    }
  }

  // Open Session
  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    const amount = parseFloat(initialAmount) || 0

    try {
      const { error } = await supabase.from('cash_sessions').insert({
        user_id: profile.id,
        branch_id: activeBranchId,
        initial_amount: amount,
        status: 'open',
      })
      if (error) throw error
      toast.success('Caja abierta exitosamente')
      setIsOpenModalOpen(false)
      loadCashData()
    } catch (err: any) {
      toast.error(err.message || 'Error al abrir caja')
    }
  }

  // Add Cash Movement (Income / Expense)
  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSession || !profile?.id) return
    const amt = parseFloat(movementAmount) || 0
    if (amt <= 0 || !movementDesc.trim()) {
      toast.error('Ingresa un monto y motivo válido')
      return
    }

    setSavingMovement(true)
    try {
      const { error } = await supabase.from('cash_movements').insert({
        session_id: activeSession.id,
        type: movementType,
        amount: amt,
        description: movementDesc.trim(),
        created_by: profile.id,
      })
      if (error) throw error

      // Update session totals
      if (movementType === 'income') {
        await supabase
          .from('cash_sessions')
          .update({ total_income: activeSession.total_income + amt })
          .eq('id', activeSession.id)
      } else {
        await supabase
          .from('cash_sessions')
          .update({ total_expense: activeSession.total_expense + amt })
          .eq('id', activeSession.id)
      }

      toast.success(
        movementType === 'income' ? 'Ingreso registrado' : 'Egreso registrado'
      )
      setIsMovementModalOpen(false)
      setMovementAmount('')
      setMovementDesc('')
      loadCashData()
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar movimiento')
    } finally {
      setSavingMovement(false)
    }
  }

  // Close Session Arqueo
  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSession) return
    const counted = parseFloat(countedAmount) || 0

    setClosing(true)
    try {
      const { data, error } = await supabase.rpc('close_cash_session', {
        p_session_id: activeSession.id,
        p_counted_amount: counted,
        p_notes: closeNotes.trim(),
      })

      if (error) throw error
      toast.success('Caja cerrada con éxito')
      setIsCloseModalOpen(false)
      setCountedAmount('')
      setCloseNotes('')
      loadCashData()
    } catch (err: any) {
      toast.error(err.message || 'Error al cerrar caja')
    } finally {
      setClosing(false)
    }
  }

  // Calculated Expected Cash
  const expectedCash = activeSession
    ? activeSession.initial_amount +
      activeSession.total_cash +
      activeSession.total_income -
      activeSession.total_expense
    : 0

  const countedVal = parseFloat(countedAmount) || 0
  const difference = countedVal - expectedCash

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-emerald-500" />
            Control de Caja & Arqueos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra aperturas, turnos individuales, ingresos, egresos y cierres
          </p>
        </div>

        {activeSession ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMovementType('income')
                setIsMovementModalOpen(true)
              }}
              className="btn-secondary text-xs"
            >
              <PlusCircle className="w-4 h-4 text-emerald-500" />
              <span>Ingreso</span>
            </button>
            <button
              onClick={() => {
                setMovementType('expense')
                setIsMovementModalOpen(true)
              }}
              className="btn-secondary text-xs"
            >
              <MinusCircle className="w-4 h-4 text-rose-500" />
              <span>Egreso</span>
            </button>
            <button
              onClick={() => setIsCloseModalOpen(true)}
              className="btn-danger text-xs"
            >
              <Lock className="w-4 h-4" />
              <span>Cerrar Caja</span>
            </button>
          </div>
        ) : (
          <button onClick={() => setIsOpenModalOpen(true)} className="btn-primary">
            <Unlock className="w-4 h-4" />
            <span>Abrir Turno de Caja</span>
          </button>
        )}
      </div>

      {/* Active Session Card */}
      {activeSession ? (
        <div className="card p-5 border-l-4 border-l-emerald-500 space-y-4 shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="badge-green text-xs flex items-center gap-1.5 w-fit mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Turno en Curso · Caja #{activeSession.id}
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-base">
                Cajero: {profile?.full_name}
              </p>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Abierta: {formatDateTime(activeSession.opened_at)}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-bold block">
                Total Esperado en Efectivo
              </span>
              <span className="text-2xl font-black text-emerald-500">
                {formatCurrency(expectedCash)}
              </span>
            </div>
          </div>

          {/* Grid of stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <span className="text-[11px] text-slate-400 block font-semibold">Monto Inicial</span>
              <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                {formatCurrency(activeSession.initial_amount)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <span className="text-[11px] text-slate-400 block font-semibold">Ventas Efectivo</span>
              <span className="font-mono font-bold text-sm text-emerald-500">
                +{formatCurrency(activeSession.total_cash)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <span className="text-[11px] text-slate-400 block font-semibold">Tarjeta / Transf</span>
              <span className="font-mono font-bold text-sm text-sky-500">
                {formatCurrency(activeSession.total_card + activeSession.total_transfer)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <span className="text-[11px] text-slate-400 block font-semibold">Egresos / Gastos</span>
              <span className="font-mono font-bold text-sm text-rose-500">
                -{formatCurrency(activeSession.total_expense)}
              </span>
            </div>
          </div>

          {/* Movements List if any */}
          {movements.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Movimientos del Turno (Ingresos / Gastos)
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                {movements.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                  >
                    <div>
                      <span
                        className={`font-bold mr-2 ${
                          m.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {m.type === 'income' ? '[+] INGRESO' : '[-] EGRESO'}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {m.description}
                      </span>
                    </div>
                    <span className="font-mono font-bold">
                      {formatCurrency(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
            No tienes un turno de caja activo
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Abre tu caja con un monto inicial para registrar ventas y llevar el control del efectivo.
          </p>
          <button onClick={() => setIsOpenModalOpen(true)} className="btn-primary mx-auto text-xs">
            <Unlock className="w-4 h-4" /> Abrir Caja
          </button>
        </div>
      )}

      {/* History of Past Sessions */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-sky-500" />
            Historial de Cierres de Caja
          </h3>
          <span className="text-xs text-slate-400">Últimas 30 sesiones</span>
        </div>

        <div className="table-container border-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Caja #</th>
                <th>Cajero</th>
                <th>Apertura</th>
                <th>Cierre</th>
                <th className="text-right">Monto Inicial</th>
                <th className="text-right">Total Ventas</th>
                <th className="text-right">Contado</th>
                <th className="text-right">Diferencia</th>
                <th className="text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {allSessions.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono font-bold text-xs text-sky-500">#{s.id}</td>
                  <td className="font-medium text-xs text-slate-800 dark:text-slate-200">
                    {s.profile?.full_name || 'Cajero'}
                  </td>
                  <td className="text-xs text-slate-500">{formatDateTime(s.opened_at)}</td>
                  <td className="text-xs text-slate-500">
                    {s.closed_at ? formatDateTime(s.closed_at) : 'En curso'}
                  </td>
                  <td className="text-right font-mono text-xs">{formatCurrency(s.initial_amount)}</td>
                  <td className="text-right font-mono font-bold text-xs">
                    {formatCurrency(s.total_sales)}
                  </td>
                  <td className="text-right font-mono text-xs">
                    {s.counted_amount !== null ? formatCurrency(s.counted_amount) : '-'}
                  </td>
                  <td className="text-right font-mono text-xs">
                    {s.difference !== null ? (
                      <span
                        className={
                          s.difference === 0
                            ? 'text-emerald-500 font-bold'
                            : s.difference > 0
                            ? 'text-sky-500 font-bold'
                            : 'text-rose-500 font-bold'
                        }
                      >
                        {formatCurrency(s.difference)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="text-center">
                    <span className={s.status === 'open' ? 'badge-green' : 'badge-gray'}>
                      {s.status === 'open' ? 'Abierta' : 'Cerrada'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Open Session */}
      <Modal
        isOpen={isOpenModalOpen}
        onClose={() => setIsOpenModalOpen(false)}
        title="Apertura de Caja"
        size="sm"
      >
        <form onSubmit={handleOpenSession} className="space-y-4">
          <div>
            <label className="label">Monto Inicial en Efectivo (Lps) *</label>
            <input
              type="number"
              step="0.01"
              required
              min="0"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              className="input-base text-center font-mono font-black text-xl py-2.5 text-emerald-500"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpenModalOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Abrir Turno
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Movement */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title={movementType === 'income' ? 'Registrar Ingreso de Efectivo' : 'Registrar Egreso / Gasto'}
        size="sm"
      >
        <form onSubmit={handleAddMovement} className="space-y-4">
          <div>
            <label className="label">Monto (Lps) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              placeholder="0.00"
              className="input-base font-mono font-bold"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Concepto / Motivo *</label>
            <input
              type="text"
              required
              value={movementDesc}
              onChange={(e) => setMovementDesc(e.target.value)}
              placeholder="ej. Pago a proveedor de pan, cambio inicial, etc."
              className="input-base text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" disabled={savingMovement} className="btn-primary">
              {savingMovement ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Guardar</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Close Session & Arqueo */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Cierre & Arqueo de Caja"
        size="md"
      >
        <form onSubmit={handleCloseSession} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Monto Inicial:</span>
              <span className="font-mono font-bold">
                {formatCurrency(activeSession?.initial_amount || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ventas en Efectivo:</span>
              <span className="font-mono font-bold text-emerald-500">
                +{formatCurrency(activeSession?.total_cash || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ingresos Extras:</span>
              <span className="font-mono font-bold text-sky-500">
                +{formatCurrency(activeSession?.total_income || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Egresos / Gastos:</span>
              <span className="font-mono font-bold text-rose-500">
                -{formatCurrency(activeSession?.total_expense || 0)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white">
              <span>EFECTIVO ESPERADO:</span>
              <span className="font-mono text-emerald-500">{formatCurrency(expectedCash)}</span>
            </div>
          </div>

          <div>
            <label className="label">Efectivo Real Contado en Caja (Lps) *</label>
            <input
              type="number"
              step="0.01"
              required
              min="0"
              value={countedAmount}
              onChange={(e) => setCountedAmount(e.target.value)}
              placeholder="0.00"
              className="input-base text-center font-mono font-black text-2xl py-3 text-slate-900 dark:text-white"
              autoFocus
            />
          </div>

          {/* Difference Indicator */}
          {countedAmount && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                difference === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-600 dark:text-emerald-400'
                  : difference > 0
                  ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 text-sky-600 dark:text-sky-400'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-600 dark:text-rose-400'
              }`}
            >
              <span>Diferencia Arqueo:</span>
              <span className="text-sm font-black font-mono">
                {difference > 0 ? `+${formatCurrency(difference)} (Sobrante)` : difference < 0 ? `${formatCurrency(difference)} (Faltante)` : 'Exacto (L 0.00)'}
              </span>
            </div>
          )}

          <div>
            <label className="label">Observaciones / Notas del Cierre</label>
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="Notas opcionales sobre el turno..."
              className="input-base text-xs h-16 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCloseModalOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" disabled={closing} className="btn-danger">
              {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Confirmar Cierre de Caja</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
