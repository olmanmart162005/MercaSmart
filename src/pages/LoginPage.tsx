import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ShoppingCart, Eye, EyeOff, Loader2, UserPlus, LogIn, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import LoadingScreen from '@/components/ui/LoadingScreen'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { signIn, registerSuperAdmin, user, profile, loading: authLoading } = useAuth()
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  // Form fields
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (authLoading) return <LoadingScreen />
  if (user && profile) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingresa tu usuario y contraseña')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    setError('')

    if (isRegisterMode) {
      // Register initial Super Admin
      const { error: regError } = await registerSuperAdmin(username, fullName, password)
      if (regError) {
        setError(regError)
        toast.error(regError)
      } else {
        toast.success('¡Super Administrador creado con éxito!')
      }
    } else {
      // Normal Sign In
      const { error: authError } = await signIn(username, password)
      if (authError) {
        setError(authError)
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 flex items-center justify-center p-4">
      {/* Glow decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl shadow-sky-500/10 mb-3 p-3">
            <img src="/logo.png" alt="MercaSmart" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Merca<span className="text-sky-400">Smart</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-bold">
            Sistema POS & Administración Web
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-slide-up">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false)
                setError('')
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                !isRegisterMode
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true)
                setError('')
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isRegisterMode
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Primer Uso (Admin)</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-3.5 text-xs flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {isRegisterMode && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ej. Administrador General"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Usuario
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej. admin o cajero1"
                autoComplete="username"
                autoFocus
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="current-password"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
                isRegisterMode
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-sky-500/25'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : isRegisterMode ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Crear Cuenta de Administrador</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            {isRegisterMode ? (
              <p className="text-xs text-slate-400">
                ¿Ya tienes una cuenta registrada?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false)
                    setError('')
                  }}
                  className="text-sky-400 font-bold hover:underline"
                >
                  Inicia sesión aquí
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                ¿Es tu primera vez usando MercaSmart?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true)
                    setError('')
                  }}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Registra tu Administrador aquí
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
