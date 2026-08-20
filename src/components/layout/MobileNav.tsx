import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard,
  ShoppingCart,
  DollarSign,
  Package,
  Boxes,
  Users,
  BarChart3
} from 'lucide-react'

interface MobileNavProps {
  sidebarOpen?: boolean
}

export default function MobileNav({ sidebarOpen = false }: MobileNavProps) {
  const { role, isSuperAdmin, isAdmin, isCajero } = useAuth()

  // Ocultar completamente cuando el sidebar/hamburguesa está abierto
  if (sidebarOpen) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 lg:hidden px-2 py-1.5 shadow-lg safe-area-pb">
      <div className="flex items-center justify-around">
        {/* Dashboard */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-sky-500 dark:text-sky-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Inicio</span>
        </NavLink>

        {/* POS */}
        {(isAdmin || isCajero) && (
          <NavLink
            to="/pos"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 rounded-2xl text-[10px] font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/30'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`
            }
          >
            <ShoppingCart className="w-5 h-5" />
            <span>POS</span>
          </NavLink>
        )}

        {/* Caja */}
        {(isAdmin || isCajero) && (
          <NavLink
            to="/cash"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-sky-500 dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`
            }
          >
            <DollarSign className="w-5 h-5" />
            <span>Caja</span>
          </NavLink>
        )}

        {/* Productos (Admin) / Inventario (Super Admin) */}
        {isAdmin && (
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-sky-500 dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`
            }
          >
            <Package className="w-5 h-5" />
            <span>Productos</span>
          </NavLink>
        )}

        {/* Inventario or Reportes */}
        {isAdmin ? (
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-sky-500 dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`
            }
          >
            <BarChart3 className="w-5 h-5" />
            <span>Reportes</span>
          </NavLink>
        ) : isCajero ? (
          <NavLink
            to="/customers"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-sky-500 dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`
            }
          >
            <Users className="w-5 h-5" />
            <span>Clientes</span>
          </NavLink>
        ) : (
          <NavLink
            to="/inventory"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-sky-500 dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`
            }
          >
            <Boxes className="w-5 h-5" />
            <span>Kardex</span>
          </NavLink>
        )}
      </div>
    </nav>
  )
}
