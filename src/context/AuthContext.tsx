import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  role: UserRole | null
  isSuperAdmin: boolean
  isAdmin: boolean
  isCajero: boolean
  signIn: (username: string, password: string) => Promise<{ error: string | null }>
  registerSuperAdmin: (username: string, fullName: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)

  const normalizeRole = (role?: string): UserRole => {
    if (!role) return 'cashier'
    if (role === 'super_admin') return 'super_admin'
    if (role === 'admin' || role === 'Admin' || role === 'Empleado') return 'admin'
    return 'cashier'
  }

  const fetchProfile = useCallback(async (userId: string, currentUser?: User) => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, branch:branches(*)')
        .eq('id', userId)
        .maybeSingle()

      if (!error && data) {
        setProfile({
          ...(data as Profile),
          role: normalizeRole(data.role),
        })
      } else {
        // Fallback profile if row in profiles is not populated yet
        const meta = currentUser?.user_metadata || {}
        const cleanUser = meta.username || currentUser?.email?.split('@')[0] || 'superadmin'
        const role = normalizeRole(meta.role || 'super_admin')

        const fallback: Profile = {
          id: userId,
          username: cleanUser,
          full_name: meta.full_name || 'Super Administrador',
          role,
          branch_id: meta.branch_id || (role === 'super_admin' ? null : 'a0000000-0000-0000-0000-000000000001'),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setProfile(fallback)
      }
    } catch (err) {
      console.error('[AuthContext] Error loading profile:', err)
    } finally {
      fetchingRef.current = false
      setLoading(false)
    }
  }, [])

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user)
  }

  useEffect(() => {
    let isMounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          await fetchProfile(newSession.user.id, newSession.user)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async (
    username: string,
    password: string
  ): Promise<{ error: string | null }> => {
    try {
      const cleanUsername = username.trim().toLowerCase()
      const email = cleanUsername.includes('@')
        ? cleanUsername
        : `${cleanUsername}@mercasmart.com`

      console.log('[Auth] Attempting login for:', { username: cleanUsername, email })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('[Auth Error]', {
          message: error.message,
          status: error.status,
          code: (error as any).code,
        })

        if (
          error.message.includes('Invalid login credentials') ||
          (error as any).code === 'invalid_credentials'
        ) {
          return {
            error: 'Credenciales incorrectas. Verifica tu usuario y contraseña.',
          }
        }
        return { error: error.message }
      }

      if (data.user) {
        await fetchProfile(data.user.id, data.user)
      }

      return { error: null }
    } catch (err: any) {
      console.error('[Auth Exception]', err)
      return { error: err.message || 'Error inesperado al iniciar sesión' }
    }
  }

  const registerSuperAdmin = async (
    username: string,
    fullName: string,
    password: string
  ): Promise<{ error: string | null }> => {
    try {
      const cleanUsername = username.trim().toLowerCase()
      const email = `${cleanUsername}@mercasmart.com`

      console.log('[Auth] Registering Super Admin:', { username: cleanUsername, email })

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: fullName.trim() || 'Super Administrador',
            role: 'super_admin',
          },
        },
      })

      if (error) {
        console.error('[SignUp Error]', {
          message: error.message,
          status: error.status,
        })
        return { error: error.message }
      }

      if (data.user) {
        if (data.session) {
          await supabase.from('profiles').upsert(
            {
              id: data.user.id,
              username: cleanUsername,
              full_name: fullName.trim() || 'Super Administrador',
              role: 'super_admin',
              branch_id: null,
              is_active: true,
            },
            { onConflict: 'id' }
          )
          await fetchProfile(data.user.id, data.user)
        } else {
          const { data: signData } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (signData?.user) {
            await supabase.from('profiles').upsert(
              {
                id: signData.user.id,
                username: cleanUsername,
                full_name: fullName.trim() || 'Super Administrador',
                role: 'super_admin',
                branch_id: null,
                is_active: true,
              },
              { onConflict: 'id' }
            )
            await fetchProfile(signData.user.id, signData.user)
          }
        }
      }

      return { error: null }
    } catch (err: any) {
      console.error('[SignUp Exception]', err)
      return { error: err.message || 'Error al registrar Super Admin' }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    localStorage.removeItem('mercasmart_selected_branch')
  }

  const role = profile?.role ? normalizeRole(profile.role) : null
  const isSuperAdmin = role === 'super_admin'
  const isAdmin = role === 'admin' || isSuperAdmin
  const isCajero = role === 'cashier'

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        role,
        isSuperAdmin,
        isAdmin,
        isCajero,
        signIn,
        registerSuperAdmin,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
