import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import type { Branch } from '@/types'

interface BranchContextType {
  branches: Branch[]
  selectedBranchId: string | null // null = Global view (only for super_admin)
  selectedBranch: Branch | null
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
      setSelectedBranchIdState(profile.branch_id || 'a0000000-0000-0000-0000-000000000001')
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

  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) || null

  const isGlobalView = isSuperAdmin && selectedBranchId === null

  // Fallback branch ID for inserts/writes
  const activeBranchId =
    selectedBranchId ||
    profile?.branch_id ||
    branches[0]?.id ||
    'a0000000-0000-0000-0000-000000000001'

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
        reloadBranches: loadBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (!context) throw new Error('useBranch must be used within BranchProvider')
  return context
}
