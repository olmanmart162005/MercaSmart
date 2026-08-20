import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Sun, Moon, Building2, ShieldCheck, User } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'

interface HeaderProps {
  onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { profile, role, isSuperAdmin } = useAuth()
  const {
    branches,
    selectedBranchId,
    selectedBranch,
    isGlobalView,
    setSelectedBranchId,
  } = useBranch()

  const avatarUrl = (profile as any)?.avatar_url

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Super Admin Branch Switcher */}
        {isSuperAdmin ? (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-500 hidden sm:inline" />
            <select
              value={selectedBranchId || 'ALL'}
              onChange={(e) => {
                const val = e.target.value
                setSelectedBranchId(val === 'ALL' ? null : val)
              }}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-800 dark:text-slate-100 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-sm"
            >
              <option value="ALL">🌐 Vista Global</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Logo de sucursal activa */}
            {selectedBranch?.logo_url && (
              <img
                src={selectedBranch.logo_url}
                alt={selectedBranch.name}
                className="w-6 h-6 object-contain rounded"
              />
            )}
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              📍 {selectedBranch?.name || 'Sucursal Principal'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Role indicator pill (desktop) */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
          <span>{profile?.full_name || profile?.username}</span>
          <span className="text-slate-400 font-bold uppercase text-[10px]">
            ({role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Cajero'})
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>

        {/* Avatar / Perfil */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-sky-500 to-emerald-500 text-white font-bold text-sm hover:ring-2 hover:ring-sky-400 transition-all shadow-sm"
          title="Mi perfil"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span>{(profile?.full_name || profile?.username || 'U').charAt(0).toUpperCase()}</span>
          )}
        </button>
      </div>
    </header>
  )
}
