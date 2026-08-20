import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateTime } from '@/utils'
import {
  TrendingUp,
  Package,
  Users,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Building2,
  Clock,
  ChevronRight,
  RefreshCw,
  Loader2,
  Activity,
  Layers
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Sale, Product, CashSession, Branch } from '@/types'
import { useNavigate } from 'react-router-dom'

// ============================================================
// COMPONENTE TARJETA ESTADÍSTICA
// ============================================================
const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string
  value: string
  icon: React.ElementType
  color: string
  subtitle?: string
}) => (
  <div className="stat-card animate-fade-in">
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      {subtitle && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
      )}
    </div>
  </div>
)

// ============================================================
// 1. DASHBOARD SUPER ADMIN (VISTA GLOBAL O FILTRADA)
// ============================================================
function SuperAdminDashboard() {
  const { selectedBranchId, selectedBranch, isGlobalView, branches } = useBranch()
  const [stats, setStats] = useState({
    todaySales: 0,
    monthSales: 0,
    totalProducts: 0,
    lowStockCount: 0,
    totalUsers: 0,
    totalBranches: 0,
  })
  const [chartData, setChartData] = useState<{ day: string; total: number }[]>([])
  const [branchSalesData, setBranchSalesData] = useState<{ name: string; total: number }[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadSuperAdminData()
  }, [selectedBranchId])

  const loadSuperAdminData = async () => {
    setLoading(true)
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const monthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd')

    try {
      // Build queries with optional branch_id filter
      let salesTodayQuery = supabase
        .from('sales')
        .select('total, branch_id')
        .gte('created_at', todayStr + 'T00:00:00')
        .lte('created_at', todayStr + 'T23:59:59')
        .eq('is_cancelled', false)

      let salesMonthQuery = supabase
        .from('sales')
        .select('total, branch_id')
        .gte('created_at', monthStart + 'T00:00:00')
        .eq('is_cancelled', false)

      let productsQuery = supabase
        .from('products')
        .select('id, stock, min_stock, branch_id')
        .eq('is_active', true)

      let recentQuery = supabase
        .from('sales')
        .select('*, profile:profiles(full_name), branch:branches(name)')
        .eq('is_cancelled', false)
        .order('created_at', { ascending: false })
        .limit(8)

      if (selectedBranchId) {
        salesTodayQuery = salesTodayQuery.eq('branch_id', selectedBranchId)
        salesMonthQuery = salesMonthQuery.eq('branch_id', selectedBranchId)
        productsQuery = productsQuery.eq('branch_id', selectedBranchId)
        recentQuery = recentQuery.eq('branch_id', selectedBranchId)
      }

      const [salesTodayRes, salesMonthRes, productsRes, usersRes, branchesRes, recentRes] =
        await Promise.all([
          salesTodayQuery,
          salesMonthQuery,
          productsQuery,
          supabase.from('profiles').select('id').eq('is_active', true),
          supabase.from('branches').select('id, name').eq('is_active', true),
          recentQuery,
        ])

      const todayTotal = (salesTodayRes.data || []).reduce((s, r) => s + Number(r.total), 0)
      const monthTotal = (salesMonthRes.data || []).reduce((s, r) => s + Number(r.total), 0)
      const prods = (productsRes.data || []) as Product[]
      const lowStock = prods.filter((p) => p.stock <= p.min_stock)

      setStats({
        todaySales: todayTotal,
        monthSales: monthTotal,
        totalProducts: prods.length,
        lowStockCount: lowStock.length,
        totalUsers: usersRes.data?.length || 0,
        totalBranches: branchesRes.data?.length || 0,
      })

      setRecentSales((recentRes.data as unknown as Sale[]) || [])

      // Last 7 days chart
      const chartPromises = Array.from({ length: 7 }, async (_, i) => {
        const d = subDays(today, 6 - i)
        const ds = format(d, 'yyyy-MM-dd')
        let q = supabase
          .from('sales')
          .select('total')
          .gte('created_at', ds + 'T00:00:00')
          .lte('created_at', ds + 'T23:59:59')
          .eq('is_cancelled', false)

        if (selectedBranchId) q = q.eq('branch_id', selectedBranchId)
        const { data } = await q
        return {
          day: format(d, 'EEE', { locale: es }),
          total: (data || []).reduce((s, r) => s + Number(r.total), 0),
        }
      })
      const chart = await Promise.all(chartPromises)
      setChartData(chart)

      // Comparison by branch (if in Global View)
      if (isGlobalView && branchesRes.data) {
        const branchList = branchesRes.data as Branch[]
        const branchTotals = branchList.map((b) => {
          const total = (salesMonthRes.data || [])
            .filter((s: any) => s.branch_id === b.id)
            .reduce((s, r: any) => s + Number(r.total), 0)
          return { name: b.name, total }
        })
        setBranchSalesData(branchTotals)
      }
    } catch (err) {
      console.error('Error loading super admin dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Scope banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-sky-900/20 border border-purple-500/30 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">
              {isGlobalView
                ? '🌐 Vista Global Consolidada'
                : `📍 Sucursal: ${selectedBranch?.name}`}
            </h3>
            <p className="text-xs text-slate-300">
              {isGlobalView
                ? `Mostrando métricas unificadas de las ${stats.totalBranches} sucursales activas`
                : `Código: ${selectedBranch?.code} · Datos filtrados exclusivamente para este local`}
            </p>
          </div>
        </div>
        <button onClick={loadSuperAdminData} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Ventas Hoy"
          value={formatCurrency(stats.todaySales)}
          icon={DollarSign}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          title="Ventas del Mes"
          value={formatCurrency(stats.monthSales)}
          icon={TrendingUp}
          color="bg-sky-500/10 text-sky-500"
        />
        <StatCard
          title="Catálogo Productos"
          value={String(stats.totalProducts)}
          icon={Package}
          color="bg-indigo-500/10 text-indigo-500"
          subtitle={`${stats.lowStockCount} con stock bajo`}
        />
        <StatCard
          title="Stock Bajo"
          value={String(stats.lowStockCount)}
          icon={AlertTriangle}
          color="bg-amber-500/10 text-amber-500"
        />
        <StatCard
          title="Sucursales"
          value={String(stats.totalBranches)}
          icon={Building2}
          color="bg-purple-500/10 text-purple-500"
        />
        <StatCard
          title="Usuarios"
          value={String(stats.totalUsers)}
          icon={Users}
          color="bg-rose-500/10 text-rose-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Sales Trend */}
        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-500" />
            Tendencia de Ventas (Últimos 7 días)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Ventas']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ fill: '#0ea5e9', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Sales Comparison (if in Global View) */}
        {isGlobalView && (
          <div className="card p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-500" />
              Ventas del Mes por Sucursal
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchSalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Ventas del Mes']}
                    contentStyle={{ borderRadius: '12px', border: 'none' }}
                  />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sales */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-500" />
            Últimas Facturas Emitidas
          </h3>
          <button
            onClick={() => navigate('/sales')}
            className="text-xs text-sky-500 hover:underline font-semibold flex items-center gap-1"
          >
            Ver Historial Completo <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="table-container border-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Fecha / Hora</th>
                <th>Sucursal</th>
                <th>Cajero</th>
                <th>Método</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs font-bold text-sky-500">
                    {s.invoice_number}
                  </td>
                  <td className="text-xs text-slate-500">{formatDateTime(s.created_at)}</td>
                  <td>
                    <span className="badge-gray text-[11px]">
                      {s.branch?.name || 'Principal'}
                    </span>
                  </td>
                  <td className="text-xs text-slate-700 dark:text-slate-300">
                    {s.profile?.full_name || 'Cajero'}
                  </td>
                  <td>
                    <span className="badge-gray text-[10px]">{s.payment_method}</span>
                  </td>
                  <td className="text-right font-black text-xs text-slate-900 dark:text-white">
                    {formatCurrency(s.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 2. DASHBOARD ADMIN (SOLO SU SUCURSAL)
// ============================================================
function AdminDashboard() {
  const { profile } = useAuth()
  const branchId = profile?.branch_id || 'a0000000-0000-0000-0000-000000000001'
  const [stats, setStats] = useState({
    todaySales: 0,
    monthSales: 0,
    totalProducts: 0,
    lowStockCount: 0,
  })
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    setLoading(true)
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const monthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd')

    try {
      const [todayRes, monthRes, prodRes, recentRes] = await Promise.all([
        supabase
          .from('sales')
          .select('total')
          .eq('branch_id', branchId)
          .gte('created_at', todayStr + 'T00:00:00')
          .lte('created_at', todayStr + 'T23:59:59')
          .eq('is_cancelled', false),
        supabase
          .from('sales')
          .select('total')
          .eq('branch_id', branchId)
          .gte('created_at', monthStart + 'T00:00:00')
          .eq('is_cancelled', false),
        supabase
          .from('products')
          .select('*')
          .eq('branch_id', branchId)
          .eq('is_active', true),
        supabase
          .from('sales')
          .select('*, profile:profiles(full_name)')
          .eq('branch_id', branchId)
          .eq('is_cancelled', false)
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      const todayTotal = (todayRes.data || []).reduce((s, r) => s + Number(r.total), 0)
      const monthTotal = (monthRes.data || []).reduce((s, r) => s + Number(r.total), 0)
      const prods = (prodRes.data as Product[]) || []
      const lowStock = prods.filter((p) => p.stock <= p.min_stock)

      setStats({
        todaySales: todayTotal,
        monthSales: monthTotal,
        totalProducts: prods.length,
        lowStockCount: lowStock.length,
      })
      setLowStockProducts(lowStock.slice(0, 5))
      setRecentSales((recentRes.data as unknown as Sale[]) || [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="skeleton h-64 rounded-2xl" />
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ventas de Hoy"
          value={formatCurrency(stats.todaySales)}
          icon={DollarSign}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          title="Ventas del Mes"
          value={formatCurrency(stats.monthSales)}
          icon={TrendingUp}
          color="bg-sky-500/10 text-sky-500"
        />
        <StatCard
          title="Productos en Tienda"
          value={String(stats.totalProducts)}
          icon={Package}
          color="bg-indigo-500/10 text-indigo-500"
        />
        <StatCard
          title="Stock Bajo"
          value={String(stats.lowStockCount)}
          icon={AlertTriangle}
          color="bg-amber-500/10 text-amber-500"
        />
      </div>

      {stats.lowStockCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-sm text-amber-700 dark:text-amber-300">
              {stats.lowStockCount} productos requieren reabastecimiento
            </span>
          </div>
          <button
            onClick={() => navigate('/inventory')}
            className="btn-primary text-xs"
          >
            Ver Inventario
          </button>
        </div>
      )}

      {/* Recent Sales Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Ventas Recientes de la Sucursal
          </h3>
          <button
            onClick={() => navigate('/sales')}
            className="text-xs text-sky-500 hover:underline"
          >
            Ver todas
          </button>
        </div>
        <div className="table-container border-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Hora</th>
                <th>Cajero</th>
                <th>Pago</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs text-sky-500">{s.invoice_number}</td>
                  <td className="text-xs text-slate-500">
                    {formatDateTime(s.created_at).split(' ')[1]}
                  </td>
                  <td className="text-xs">{s.profile?.full_name}</td>
                  <td>
                    <span className="badge-gray text-[10px]">{s.payment_method}</span>
                  </td>
                  <td className="text-right font-black text-xs">{formatCurrency(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 3. DASHBOARD CAJERO (TURNO DE CAJA & ACCESO RÁPIDO POS)
// ============================================================
function CashierDashboard() {
  const { profile } = useAuth()
  const [session, setSession] = useState<CashSession | null>(null)
  const [sessionSales, setSessionSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadCashierSession()
  }, [])

  const loadCashierSession = async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'open')
        .maybeSingle()

      setSession(data as CashSession | null)

      if (data) {
        const { data: sales } = await supabase
          .from('sales')
          .select('*')
          .eq('cash_session_id', data.id)
          .eq('is_cancelled', false)
          .order('created_at', { ascending: false })
          .limit(10)
        setSessionSales((sales as Sale[]) || [])
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="skeleton h-64 rounded-2xl" />

  const totalVentasTurno = sessionSales.reduce((s, r) => s + Number(r.total), 0)

  return (
    <div className="space-y-6">
      {/* Session Status Banner */}
      <div className="card p-6 border-l-4 border-l-emerald-500 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
              {session ? `Turno Activo · Caja #${session.id}` : 'Caja Cerrada'}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Bienvenido, {profile?.full_name}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {session
              ? `Turno iniciado el ${formatDateTime(session.opened_at)}`
              : 'Debes abrir tu caja para comenzar a facturar en el POS'}
          </p>
        </div>

        <button
          onClick={() => navigate('/pos')}
          className="btn-primary py-3 px-6 text-sm font-extrabold shadow-lg shadow-emerald-500/25 bg-gradient-to-r from-emerald-500 to-teal-600"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Ir al Punto de Venta (POS)</span>
        </button>
      </div>

      {/* Cashier Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs text-slate-400">Fondo Inicial</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {formatCurrency(session?.initial_amount || 0)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-400">Vendido en Turno</p>
          <p className="text-xl font-black text-emerald-500">
            {formatCurrency(totalVentasTurno)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-400">Total Transacciones</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {sessionSales.length}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-400">Efectivo en Caja</p>
          <p className="text-xl font-black text-sky-500">
            {formatCurrency((session?.initial_amount || 0) + (session?.total_cash || 0))}
          </p>
        </div>
      </div>

      {/* Recent sales from cashier session */}
      {sessionSales.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Mis Ventas de este Turno
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sessionSales.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 text-xs">
                <div>
                  <p className="font-mono font-bold text-sky-500">{s.invoice_number}</p>
                  <p className="text-slate-400">{s.customer_name || 'Consumidor Final'} · {s.payment_method}</p>
                </div>
                <p className="font-black text-sm text-slate-900 dark:text-white">
                  {formatCurrency(s.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// COMPONENTE PRINCIPAL DASHBOARD
// ============================================================
export default function DashboardPage() {
  const { role, isSuperAdmin, isAdmin, isCajero } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {isSuperAdmin
            ? '📊 Panel de Control Super Admin'
            : isAdmin
            ? '🏬 Administración de Sucursal'
            : '🏪 Panel de Caja'}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {isSuperAdmin && <SuperAdminDashboard />}
      {!isSuperAdmin && isAdmin && <AdminDashboard />}
      {isCajero && <CashierDashboard />}
    </div>
  )
}
