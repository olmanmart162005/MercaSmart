import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { UserRole } from '@/types'
import LoadingScreen from '@/components/ui/LoadingScreen'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading, role, isSuperAdmin } = useAuth()

  if (loading) return <LoadingScreen />

  // Si no hay usuario autenticado en Supabase, ir a login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Si hay usuario pero el perfil aún se está sincronizando, mostrar cargador
  if (!profile) {
    return <LoadingScreen />
  }

  // Si el usuario está marcado como inactivo
  if (!profile.is_active) {
    return <Navigate to="/login" replace />
  }

  // Super Admin tiene acceso total a todas las rutas
  if (isSuperAdmin) {
    return <Outlet />
  }

  // Verificar roles específicos
  if (allowedRoles && role) {
    const hasRole = allowedRoles.some((r) => {
      if (r === role) return true
      if (r === 'admin' && (role === 'Admin' || role === 'admin')) return true
      if (r === 'cashier' && (role === 'Cajero' || role === 'cashier')) return true
      return false
    })

    if (!hasRole) {
      return <Navigate to="/" replace />
    }
  }

  return <Outlet />
}
