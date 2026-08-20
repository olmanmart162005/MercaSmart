import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/utils'
import {
  BarChart3,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  ShoppingCart,
  Calendar,
  Filter,
  Loader2,
  Building2,
  Printer,
  FileSpreadsheet,
  PieChart as PieIcon,
  Boxes,
  AlertTriangle
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

const COLORS = ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

export default function ReportsPage() {
  const { isAdmin } = useAuth()
  const { selectedBranchId, selectedBranch, isGlobalView } = useBranch()

  const [activeReport, setActiveReport] = useState<'sales' | 'products' | 'cash' | 'payment_methods' | 'inventory'>('sales')
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  const [salesData, setSalesData] = useState<Array<{ date: string; total: number; count: number }>>([])
  const [topProducts, setTopProducts] = useState<Array<{ name: string; quantity: number; revenue: number }>>([])
  const [cashSessionsData, setCashSessionsData] = useState<any[]>([])
  const [paymentMethodsData, setPaymentMethodsData] = useState<Array<{ name: string; total: number; count: number }>>([])
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [summaryStats, setSummaryStats] = useState({ total: 0, count: 0, avg: 0, tax: 0, discount: 0 })

  useEffect(() => {
    loadReportData()
  }, [activeReport, dateFrom, dateTo, selectedBranchId])

  const loadReportData = async () => {
    setLoading(true)
    try {
      if (activeReport === 'sales') {
        let q = supabase
          .from('sales')
          .select('created_at, total, tax_amount, discount_amount, is_cancelled, branch_id')
          .gte('created_at', dateFrom + 'T00:00:00')
          .lte('created_at', dateTo + 'T23:59:59')
          .eq('is_cancelled', false)

        if (selectedBranchId) q = q.eq('branch_id', selectedBranchId)

        const { data } = await q
        if (data) {
          const byDay: Record<string, { total: number; count: number }> = {}
          data.forEach((s: any) => {
            const day = s.created_at.split('T')[0]
            if (!byDay[day]) byDay[day] = { total: 0, count: 0 }
            byDay[day].total += Number(s.total)
            byDay[day].count++
          })
          setSalesData(
            Object.entries(byDay).map(([date, v]) => ({
              date: date.split('-').slice(1).join('/'),
              ...v,
            }))
          )

          const totals = data.reduce(
            (acc: any, s: any) => ({
              total: acc.total + Number(s.total),
              count: acc.count + 1,
              tax: acc.tax + Number(s.tax_amount || 0),
              discount: acc.discount + Number(s.discount_amount || 0),
            }),
            { total: 0, count: 0, tax: 0, discount: 0 }
          )
          setSummaryStats({
            ...totals,
            avg: totals.count > 0 ? totals.total / totals.count : 0,
          })
        }
      }

      if (activeReport === 'products') {
        let q = supabase
          .from('sale_items')
          .select('quantity, subtotal, products(name), branch_id, sales!inner(created_at, is_cancelled)')
          .gte('sales.created_at', dateFrom + 'T00:00:00')
          .lte('sales.created_at', dateTo + 'T23:59:59')
          .eq('sales.is_cancelled', false)

        if (selectedBranchId) q = q.eq('branch_id', selectedBranchId)

        const { data } = await q
        if (data) {
          const byProduct: Record<string, { quantity: number; revenue: number }> = {}
          data.forEach((item: any) => {
            const name = item.products?.name || 'Producto'
            if (!byProduct[name]) byProduct[name] = { quantity: 0, revenue: 0 }
            byProduct[name].quantity += Number(item.quantity || 0)
            byProduct[name].revenue += Number(item.subtotal || 0)
          })

          const sorted = Object.entries(byProduct)
            .map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)
          setTopProducts(sorted)
        }
      }

      if (activeReport === 'cash') {
        let q = supabase
          .from('cash_sessions')
          .select('*, profile:profiles(full_name), branch:branches(name)')
          .gte('opened_at', dateFrom + 'T00:00:00')
          .lte('opened_at', dateTo + 'T23:59:59')
          .order('opened_at', { ascending: false })

        if (selectedBranchId) q = q.eq('branch_id', selectedBranchId)

        const { data } = await q
        if (data) setCashSessionsData(data)
      }

      if (activeReport === 'payment_methods') {
        let q = supabase
          .from('sales')
          .select('payment_method, total, is_cancelled, branch_id')
          .gte('created_at', dateFrom + 'T00:00:00')
          .lte('created_at', dateTo + 'T23:59:59')
          .eq('is_cancelled', false)

        if (selectedBranchId) q = q.eq('branch_id', selectedBranchId)

        const { data } = await q
        if (data) {
          const byMethod: Record<string, { total: number; count: number }> = {}
          data.forEach((s: any) => {
            const m = s.payment_method || 'Efectivo'
            if (!byMethod[m]) byMethod[m] = { total: 0, count: 0 }
            byMethod[m].total += Number(s.total || 0)
            byMethod[m].count++
          })
          setPaymentMethodsData(
            Object.entries(byMethod).map(([name, v]) => ({
              name,
              ...v,
            }))
          )
        }
      }

      if (activeReport === 'inventory') {
        let q = supabase
          .from('products')
          .select('id, code, name, stock, min_stock, cost_price, sale_price, is_active, category:categories(name)')
          .eq('is_active', true)
          .order('stock', { ascending: true })

        if (selectedBranchId) q = q.eq('branch_id', selectedBranchId)

        const { data } = await q
        if (data) {
          setLowStockProducts(data.filter((p: any) => Number(p.stock) <= Number(p.min_stock)))
        }
      }
    } catch (err) {
      console.error('Error loading reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    try {
      let exportData: any[] = []
      let fileName = `Reporte_${activeReport}_${dateFrom}_${dateTo}`

      if (activeReport === 'sales') {
        exportData = salesData.map((s) => ({
          Fecha: s.date,
          'Total Vendido (L)': s.total,
          'Cantidad de Ventas': s.count,
        }))
      } else if (activeReport === 'products') {
        exportData = topProducts.map((p, idx) => ({
          Posición: idx + 1,
          Producto: p.name,
          'Unidades Vendidas': p.quantity,
          'Ingreso Generado (L)': p.revenue,
        }))
      } else if (activeReport === 'cash') {
        exportData = cashSessionsData.map((s) => ({
          Turno: `#${s.id}`,
          Fecha: formatDate(s.opened_at),
          Cajero: s.profile?.full_name || 'Cajero',
          Sucursal: s.branch?.name || 'Principal',
          'Total Ventas (L)': s.total_sales,
          'Diferencia (L)': s.difference ?? '-',
          Estado: s.status === 'open' ? 'Abierta' : 'Cerrada',
        }))
      } else if (activeReport === 'payment_methods') {
        exportData = paymentMethodsData.map((m) => ({
          'Método de Pago': m.name,
          'Total Recaudado (L)': m.total,
          'Cantidad de Transacciones': m.count,
        }))
      } else if (activeReport === 'inventory') {
        exportData = lowStockProducts.map((p) => ({
          Código: p.code,
          Producto: p.name,
          Categoría: p.category?.name || '-',
          'Stock Actual': p.stock,
          'Stock Mínimo': p.min_stock,
          'Precio Venta (L)': p.sale_price,
          Estado: p.stock <= 0 ? 'Agotado' : 'Bajo Stock',
        }))
      }

      if (exportData.length === 0) {
        toast.error('No hay datos para exportar')
        return
      }

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
      XLSX.writeFile(wb, `${fileName}.xlsx`)
      toast.success('Archivo Excel exportado exitosamente')
    } catch (err: any) {
      toast.error('Error al exportar Excel: ' + err.message)
    }
  }

  if (!isAdmin) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-500">No tienes permisos para ver reportes financieros</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-sky-500" />
            Reportes & Finanzas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isGlobalView
              ? 'Métricas consolidadas de todas las sucursales'
              : `Datos de ${selectedBranch?.name || 'Sucursal'}`}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={exportToExcel} className="btn-secondary flex-1 sm:flex-initial justify-center text-xs">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Exportar Excel</span>
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex-1 sm:flex-initial justify-center text-xs">
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Report Type Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            <button
              onClick={() => setActiveReport('sales')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeReport === 'sales'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Ventas
            </button>
            <button
              onClick={() => setActiveReport('products')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeReport === 'products'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Top Productos
            </button>
            <button
              onClick={() => setActiveReport('payment_methods')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeReport === 'payment_methods'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Métodos de Pago
            </button>
            <button
              onClick={() => setActiveReport('cash')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeReport === 'cash'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Cierres de Caja
            </button>
            <button
              onClick={() => setActiveReport('inventory')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeReport === 'inventory'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Bajo Stock
            </button>
          </div>

          {/* Date Picker */}
          {activeReport !== 'inventory' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-base text-xs py-1.5 px-2.5 font-mono"
              />
              <span className="text-slate-400 text-xs">al</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-base text-xs py-1.5 px-2.5 font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Cards (For Sales) */}
      {activeReport === 'sales' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card">
            <p className="text-xs text-slate-400">Total Facturado</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatCurrency(summaryStats.total)}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-slate-400">Número de Ventas</p>
            <p className="text-xl font-black text-sky-500">{summaryStats.count}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-slate-400">Ticket Promedio</p>
            <p className="text-xl font-black text-emerald-500">
              {formatCurrency(summaryStats.avg)}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-slate-400">ISV Recaudado</p>
            <p className="text-xl font-black text-indigo-500">
              {formatCurrency(summaryStats.tax)}
            </p>
          </div>
        </div>
      )}

      {/* Report Body */}
      {loading ? (
        <div className="card p-12 text-center">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Generando reporte...</p>
        </div>
      ) : (
        <>
          {activeReport === 'sales' && (
            <div className="card p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Ventas Diarias del Período
              </h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v), 'Total']}
                      contentStyle={{ borderRadius: '12px' }}
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
          )}

          {activeReport === 'products' && (
            <div className="space-y-6">
              <div className="card p-5">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
                  Gráfico de Ingresos por Producto
                </h3>
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} angle={-25} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), 'Ingresos']} contentStyle={{ borderRadius: '12px' }} />
                      <Bar dataKey="revenue" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Top 10 Productos Más Vendidos
                  </h3>
                </div>
                <div className="table-container border-0">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Producto</th>
                        <th className="text-right">Unidades Vendidas</th>
                        <th className="text-right">Ingreso Generado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((p, idx) => (
                        <tr key={idx}>
                          <td className="font-bold text-xs text-slate-400">{idx + 1}</td>
                          <td className="font-bold text-sm text-slate-900 dark:text-white">
                            {p.name}
                          </td>
                          <td className="text-right font-mono font-semibold">
                            {p.quantity} unid.
                          </td>
                          <td className="text-right font-mono font-black text-emerald-500">
                            {formatCurrency(p.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'payment_methods' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-5 flex flex-col items-center justify-center">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4 w-full text-left">
                  Distribución de Métodos de Pago
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodsData}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {paymentMethodsData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatCurrency(v), 'Total']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Detalle por Método de Pago
                  </h3>
                </div>
                <div className="table-container border-0">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Método</th>
                        <th className="text-right">Transacciones</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentMethodsData.map((m, idx) => (
                        <tr key={idx}>
                          <td className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            {m.name}
                          </td>
                          <td className="text-right font-mono font-semibold">
                            {m.count}
                          </td>
                          <td className="text-right font-mono font-black text-emerald-500">
                            {formatCurrency(m.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'cash' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Historial de Cierres y Arqueos de Caja
                </h3>
              </div>
              <div className="table-container border-0">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Turno</th>
                      <th>Fecha</th>
                      <th>Cajero</th>
                      <th>Sucursal</th>
                      <th className="text-right">Total Ventas</th>
                      <th className="text-right">Diferencia</th>
                      <th className="text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashSessionsData.map((s) => (
                      <tr key={s.id}>
                        <td className="font-mono text-xs font-bold text-sky-500">#{s.id}</td>
                        <td className="text-xs text-slate-500">{formatDate(s.opened_at)}</td>
                        <td className="text-xs font-medium">{s.profile?.full_name || 'Cajero'}</td>
                        <td className="text-xs text-slate-400">{s.branch?.name || 'Principal'}</td>
                        <td className="text-right font-mono font-black text-xs">
                          {formatCurrency(s.total_sales)}
                        </td>
                        <td className="text-right font-mono text-xs">
                          {s.difference !== null ? (
                            <span
                              className={
                                s.difference >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'
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
          )}

          {activeReport === 'inventory' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Productos con Stock Bajo o Agotado
                  </h3>
                  <p className="text-xs text-slate-400">Productos con existencia menor o igual al stock mínimo</p>
                </div>
                <span className="badge-red font-bold text-xs">
                  {lowStockProducts.length} productos en alerta
                </span>
              </div>
              <div className="table-container border-0">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th className="text-right">Stock Actual</th>
                      <th className="text-right">Stock Mínimo</th>
                      <th className="text-right">Precio Venta</th>
                      <th className="text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono text-xs font-bold text-sky-500">{p.code}</td>
                        <td className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</td>
                        <td className="text-xs text-slate-500">{p.category?.name || '-'}</td>
                        <td className="text-right font-mono font-bold">
                          <span className={p.stock <= 0 ? 'text-rose-500 font-black' : 'text-amber-500 font-bold'}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="text-right font-mono text-xs text-slate-400">{p.min_stock}</td>
                        <td className="text-right font-mono font-semibold text-xs">
                          {formatCurrency(p.sale_price)}
                        </td>
                        <td className="text-center">
                          <span className={p.stock <= 0 ? 'badge-red' : 'badge-amber'}>
                            {p.stock <= 0 ? 'Agotado' : 'Bajo Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
