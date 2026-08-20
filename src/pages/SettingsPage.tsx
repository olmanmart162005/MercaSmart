import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import { supabase } from '@/lib/supabase'
import { Settings, Save, Building, FileText, Printer, Loader2, CheckCircle, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

interface Config {
  BusinessName: string
  BusinessRTN: string
  BusinessAddress: string
  BusinessPhone: string
  SAR_CAI: string
  SAR_RangeMin: string
  SAR_RangeMax: string
  SAR_CurrentInvoice: string
  SAR_DeadlineDate: string
  TicketHeader: string
  TicketFooter: string
}

const defaultConfig: Config = {
  BusinessName: 'MercaSmart Supermercado',
  BusinessRTN: '08011990123456',
  BusinessAddress: 'Tegucigalpa, Honduras',
  BusinessPhone: '+504 2200-0000',
  SAR_CAI: '7A2E89-F4D21C-8941AB-DE9C83-20F12E-5C',
  SAR_RangeMin: '000-001-01-00000001',
  SAR_RangeMax: '000-001-01-00100000',
  SAR_CurrentInvoice: '000-001-01-00000000',
  SAR_DeadlineDate: '2027-12-31',
  TicketHeader: '★ MERCASMART ★',
  TicketFooter: 'Exija su Factura Fiscal\n¡Gracias por su preferencia!',
}

export default function SettingsPage() {
  const { isAdmin } = useAuth()
  const { activeBranchId, selectedBranch } = useBranch()
  const [config, setConfig] = useState<Config>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'business' | 'sar' | 'ticket'>('business')

  useEffect(() => {
    loadSettings()
  }, [activeBranchId])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('configuration')
        .select('key, value')
        .or(`branch_id.eq.${activeBranchId},branch_id.is.null`)

      if (!error && data) {
        const map: Partial<Config> = {}
        data.forEach((row: { key: string; value: string }) => {
          (map as Record<string, string>)[row.key] = row.value
        })
        setConfig((prev) => ({ ...prev, ...map }))
      }
    } catch (err) {
      console.error('Error loading config:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const entries = Object.entries(config).map(([key, value]) => ({
        key,
        value: value || '',
        branch_id: activeBranchId,
        updated_at: new Date().toISOString(),
      }))

      for (const entry of entries) {
        const { error } = await supabase
          .from('configuration')
          .upsert(entry, { onConflict: 'key, branch_id' })
        if (error) {
          // Fallback to simple upsert
          await supabase.from('configuration').upsert({ key: entry.key, value: entry.value })
        }
      }

      toast.success('Configuración guardada correctamente')
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof Config, value: string) =>
    setConfig((prev) => ({ ...prev, [key]: value }))

  if (!isAdmin) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-500">No tienes permisos para ver esta sección</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
    )
  }

  const tabs = [
    { id: 'business' as const, label: 'Datos del Negocio', icon: Building },
    { id: 'sar' as const, label: 'Facturación SAR / CAI', icon: FileText },
    { id: 'ticket' as const, label: 'Diseño de Ticket', icon: Printer },
  ]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-sky-500" />
            Configuración del Sistema
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Parámetros fiscales SAR, datos comerciales y formato de facturación
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full sm:w-auto justify-center"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Guardar Cambios</span>
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === id
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: Business */}
        {activeTab === 'business' && (
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Datos Comerciales de la Empresa
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre Comercial *</label>
                <input
                  type="text"
                  required
                  value={config.BusinessName}
                  onChange={(e) => set('BusinessName', e.target.value)}
                  placeholder="ej. MercaSmart Supermercado"
                  className="input-base font-semibold"
                />
              </div>

              <div>
                <label className="label">RTN de la Empresa *</label>
                <input
                  type="text"
                  required
                  value={config.BusinessRTN}
                  onChange={(e) => set('BusinessRTN', e.target.value)}
                  placeholder="08011990123456"
                  className="input-base font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Dirección Física del Local</label>
                <input
                  type="text"
                  value={config.BusinessAddress}
                  onChange={(e) => set('BusinessAddress', e.target.value)}
                  placeholder="Barrio, Calle, Ciudad..."
                  className="input-base text-sm"
                />
              </div>

              <div>
                <label className="label">Teléfono de Contacto</label>
                <input
                  type="text"
                  value={config.BusinessPhone}
                  onChange={(e) => set('BusinessPhone', e.target.value)}
                  placeholder="+504 2200-0000"
                  className="input-base font-mono text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: SAR */}
        {activeTab === 'sar' && (
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span>Parámetros de Facturación Fiscal SAR (Honduras)</span>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </h3>

            <div>
              <label className="label">Código de Autorización de Impresión (CAI) *</label>
              <input
                type="text"
                required
                value={config.SAR_CAI}
                onChange={(e) => set('SAR_CAI', e.target.value.toUpperCase())}
                placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XX"
                className="input-base font-mono uppercase text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Rango Autorizado Inicial *</label>
                <input
                  type="text"
                  required
                  value={config.SAR_RangeMin}
                  onChange={(e) => set('SAR_RangeMin', e.target.value)}
                  placeholder="000-001-01-00000001"
                  className="input-base font-mono text-xs"
                />
              </div>

              <div>
                <label className="label">Rango Autorizado Final *</label>
                <input
                  type="text"
                  required
                  value={config.SAR_RangeMax}
                  onChange={(e) => set('SAR_RangeMax', e.target.value)}
                  placeholder="000-001-01-00100000"
                  className="input-base font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Última Factura Emitida</label>
                <input
                  type="text"
                  value={config.SAR_CurrentInvoice}
                  onChange={(e) => set('SAR_CurrentInvoice', e.target.value)}
                  placeholder="000-001-01-00000000"
                  className="input-base font-mono text-xs text-sky-500 font-bold"
                />
              </div>

              <div>
                <label className="label">Fecha Límite de Emisión *</label>
                <input
                  type="date"
                  required
                  value={config.SAR_DeadlineDate}
                  onChange={(e) => set('SAR_DeadlineDate', e.target.value)}
                  className="input-base text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Ticket */}
        {activeTab === 'ticket' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 card p-6 space-y-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Personalización del Ticket Térmico
              </h3>

              <div>
                <label className="label">Encabezado del Ticket</label>
                <textarea
                  rows={3}
                  value={config.TicketHeader}
                  onChange={(e) => set('TicketHeader', e.target.value)}
                  placeholder="★ MERCASMART ★"
                  className="input-base font-mono text-xs"
                />
              </div>

              <div>
                <label className="label">Pie de Página del Ticket</label>
                <textarea
                  rows={3}
                  value={config.TicketFooter}
                  onChange={(e) => set('TicketFooter', e.target.value)}
                  placeholder="Exija su Factura Fiscal..."
                  className="input-base font-mono text-xs"
                />
              </div>
            </div>

            {/* Ticket Preview */}
            <div className="lg:col-span-5 card p-5 bg-amber-50/50 dark:bg-slate-950/60 border-dashed border-2 border-amber-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200">
              <p className="text-center font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-3">
                Vista Previa del Ticket
              </p>
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 dark:border-slate-700 pb-2">
                <p className="font-black text-sm">{config.BusinessName || 'MercaSmart'}</p>
                <p className="text-[11px] text-slate-500">RTN: {config.BusinessRTN || '---'}</p>
                <p className="text-[10px] text-slate-400">{config.BusinessAddress || '---'}</p>
                <p className="text-[10px] whitespace-pre-line mt-1">{config.TicketHeader}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-0.5 text-[10px]">
                <p>CAI: {config.SAR_CAI ? config.SAR_CAI.slice(0, 20) + '...' : '---'}</p>
                <p>Factura: 000-001-01-00000001</p>
                <p>Rango: {config.SAR_RangeMin} al {config.SAR_RangeMax}</p>
                <p>Fecha Límite: {config.SAR_DeadlineDate || '---'}</p>
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-500 whitespace-pre-line">
                {config.TicketFooter}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full sm:w-auto justify-center"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Guardar Toda la Configuración</span>
          </button>
        </div>
      </form>
    </div>
  )
}
