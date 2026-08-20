import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import type { Branch } from '@/types'

interface BranchConfig {
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  rtn?: string
  email?: string
  website?: string
  logo_url?: string
  is_active: boolean
}

interface BranchContextType {
  branches: Branch[]
  selectedBranchId: string | null // null = Global view (only for super_admin)
  selectedBranch: BranchConfig | null
  activeBranchId: string // Guaranteed branch ID to use for write operations
  isGlobalView: boolean
  loadingBranches: boolean
  setSelectedBranchId: (branchId: string | null) => void
  reloadBranches: () => Promise<void>
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { profile, isSuperAdmin } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(null)

  const loadBranches = async () => {
    try {
      setLoadingBranches(true)
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (!error && data) {
        setBranches(data as Branch[])
      }
    } catch (err) {
      console.error('Error loading branches:', err)
    } finally {
      setLoadingBranches(false)
    }
  }

  useEffect(() => {
    loadBranches()
  }, [])

  // Sync user's assigned branch
  useEffect(() => {
    if (!profile) return

    if (isSuperAdmin) {
      // Super Admin can restore from localStorage or default to global (null)
      const saved = localStorage.getItem('mercasmart_selected_branch')
      if (saved && saved !== 'ALL') {
        setSelectedBranchIdState(saved)
      } else {
        setSelectedBranchIdState(null)
      }
    } else {
      // Admin and Cashier are strictly bound to their assigned branch
      setSelectedBranchIdState(profile.branch_id || null)
    }
  }, [profile, isSuperAdmin])

  const setSelectedBranchId = (branchId: string | null) => {
    if (!isSuperAdmin && profile?.branch_id) {
      // Non-superadmin cannot switch branch
      setSelectedBranchIdState(profile.branch_id)
      return
    }

    setSelectedBranchIdState(branchId)
    if (branchId) {
      localStorage.setItem('mercasmart_selected_branch', branchId)
    } else {
      localStorage.setItem('mercasmart_selected_branch', 'ALL')
    }
  }

  // Compute selected branch full object
  const selectedBranch = selectedBranchId
    ? (branches.find((b) => b.id === selectedBranchId) as BranchConfig | undefined) ?? null
    : null

  // activeBranchId: the ID to use for all write operations
  // For super_admin with global view, use the first branch as fallback
  const activeBranchId =
    selectedBranchId ||
    profile?.branch_id ||
    branches[0]?.id ||
    ''

  const isGlobalView = isSuperAdmin && selectedBranchId === null

  const reloadBranches = async () => {
    await loadBranches()
  }

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranchId,
        selectedBranch,
        activeBranchId,
        isGlobalView,
        loadingBranches,
        setSelectedBranchId,
        reloadBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch must be used inside BranchProvider')
  return ctx
}
