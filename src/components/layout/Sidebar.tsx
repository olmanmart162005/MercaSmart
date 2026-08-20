import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import { getInitials, getAvatarUrl } from '@/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Award,
  Truck,
  Users,
  Receipt,
  Boxes,
  DollarSign,
  BarChart3,
  Settings,
  UserCog,
  Building2,
  X,
  LogOut,
  ShieldAlert,
  User
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile, role, isSuperAdmin, isAdmin, isCajero, signOut } = useAuth()
  const { selectedBranch } = useBranch()
  const navigate = useNavigate()
  const [avatarError, setAvatarError] = useState(false)

  const fullAvatarUrl = getAvatarUrl(profile?.avatar_url)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const roleLabel =
    role === 'super_admin'
      ? 'Super Admin'
      : role === 'admin'
      ? 'Administrador'
      : 'Cajero'

  const roleBadgeColor =
    role === 'super_admin'
      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      : role === 'admin'
      ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 p-1 flex items-center justify-center flex-shrink-0 shadow-md">
            <img
              src={selectedBranch?.logo_url || '/logo.png'}
              alt=""
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.currentTarget
                if (target.src !== window.location.origin + '/logo.png') {
                  target.src = '/logo.png'
                }
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-extrabold text-base tracking-tight text-white block leading-tight truncate">
              {selectedBranch?.name ? selectedBranch.name : 'MercaSmart'}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 block truncate">
              {selectedBranch?.code ? `Sucursal ${selectedBranch.code}` : 'POS & Multi-Sucursal'}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Navegación
        </p>

        {/* Dashboard - All Roles */}
        <NavLink
          to="/"
          onClick={onClose}
          end
          className={({ isActive }) =>
            `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>{isCajero ? 'Mi Turno' : 'Dashboard'}</span>
        </NavLink>

        {/* Super Admin: Sucursales */}
        {isSuperAdmin && (
          <NavLink
            to="/branches"
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-item font-semibold ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
              }`
            }
          >
            <Building2 className="w-5 h-5" />
            <span>Sucursales</span>
          </NavLink>
        )}

        {/* POS - Admin & Cajero */}
        {(isAdmin || isCajero) && (
          <NavLink
            to="/pos"
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-item font-semibold ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
              }`
            }
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Punto de Venta (POS)</span>
          </NavLink>
        )}

        {/* Caja - Admin & Cajero */}
        {(isAdmin || isCajero) && (
          <NavLink
            to="/cash"
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
            }
          >
            <DollarSign className="w-5 h-5" />
            <span>{isCajero ? 'Mi Caja' : 'Gestión de Caja'}</span>
          </NavLink>
        )}

        {/* Ventas - Admin & Cajero */}
        {(isAdmin || isCajero) && (
          <NavLink
            to="/sales"
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
            }
          >
            <Receipt className="w-5 h-5" />
            <span>{isCajero ? 'Mis Ventas' : 'Historial Ventas'}</span>
          </NavLink>
        )}

        {/* Clientes - Admin & Cajero */}
        {(isAdmin || isCajero) && (
          <NavLink
            to="/customers"
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
            }
          >
            <Users className="w-5 h-5" />
            <span>Clientes & Crédito</span>
          </NavLink>
        )}

        {/* Inventario & Catálogo - Solo Admin y Super Admin */}
        {isAdmin && (
          <>
            <p className="px-3 pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Inventario & Productos
            </p>
            <NavLink
              to="/products"
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
              }
            >
              <Package className="w-5 h-5" />
              <span>Productos</span>
            </NavLink>
            <NavLink
              to="/inventory"
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
              }
            >
              <Boxes className="w-5 h-5" />
              <span>Kardex & Movimientos</span>
            </NavLink>
          </>
        )}

        {/* Módulos de Administración - Solo Admin y Super Admin */}
        {isAdmin && (
          <>
            <p className="px-3 pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Administración
            </p>
            <NavLink
              to="/categories"
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
              }
            >
              <Tags className="w-5 h-5" />
              <span>Categorías</span>
            </NavLink>
            <NavLink
              to="/brands"
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
              }
            >
              <Award className="w-5 h-5" />
              <span>Marcas</span>
            </NavLink>
            <NavLink
              to="/suppliers"
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
              }
            >
              <Truck className="w-5 h-5" />
              <span>Proveedores</span>
            </NavLink>
            <NavLink
              to="/reports"
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
              }
            >
              <BarChart3 className="w-5 h-5" />
              <span>Reportes & Finanzas</span>
            </NavLink>
            <NavLink
              to="/users"
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
              }
            >
              <UserCog className="w-5 h-5" />
              <span>Usuarios</span>
            </NavLink>
            <NavLink
              to="/settings"
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
              }
            >
              <Settings className="w-5 h-5" />
              <span>Configuración SAR</span>
            </NavLink>
          </>
        )}

        {/* Mi Perfil - Todos los roles */}
        <p className="px-3 pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Cuenta
        </p>
        <NavLink
          to="/profile"
          onClick={onClose}
          className={({ isActive }) =>
            `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
          }
        >
          <User className="w-5 h-5" />
          <span>Mi Perfil</span>
        </NavLink>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div
            onClick={() => {
              navigate('/profile')
              onClose()
            }}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
            title="Ver mi perfil"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden">
              {fullAvatarUrl && !avatarError ? (
                <img
                  src={fullAvatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span>{profile?.full_name ? getInitials(profile.full_name) : 'U'}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {profile?.full_name || 'Usuario'}
              </p>
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${roleBadgeColor}`}
              >
                {roleLabel}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
