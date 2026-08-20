import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/layouts/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import BranchesPage from '@/pages/BranchesPage'
import ProductsPage from '@/pages/ProductsPage'
import CategoriesPage from '@/pages/CategoriesPage'
import BrandsPage from '@/pages/BrandsPage'
import SuppliersPage from '@/pages/SuppliersPage'
import CustomersPage from '@/pages/CustomersPage'
import POSPage from '@/pages/POSPage'
import SalesPage from '@/pages/SalesPage'
import InventoryPage from '@/pages/InventoryPage'
import CashPage from '@/pages/CashPage'
import UsersPage from '@/pages/UsersPage'
import ReportsPage from '@/pages/ReportsPage'
import SettingsPage from '@/pages/SettingsPage'
import ProtectedRoute from '@/routes/ProtectedRoute'
import LoadingScreen from '@/components/ui/LoadingScreen'

export default function App() {
  const { loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Dashboard - All Roles */}
          <Route path="/" element={<DashboardPage />} />

          {/* Super Admin Only */}
          <Route
            path="/branches"
            element={<ProtectedRoute allowedRoles={['super_admin']} />}
          >
            <Route index element={<BranchesPage />} />
          </Route>

          {/* POS & Cash - Admin & Cashier */}
          <Route
            path="/pos"
            element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'cashier']} />}
          >
            <Route index element={<POSPage />} />
          </Route>
          <Route
            path="/cash"
            element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'cashier']} />}
          >
            <Route index element={<CashPage />} />
          </Route>
          <Route
            path="/sales"
            element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'cashier']} />}
          >
            <Route index element={<SalesPage />} />
          </Route>
          <Route
            path="/customers"
            element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'cashier']} />}
          >
            <Route index element={<CustomersPage />} />
          </Route>

          {/* Inventory & Products - Admin & Super Admin */}
          <Route
            path="/products"
            element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}
          >
            <Route index element={<ProductsPage />} />
          </Route>
          <Route
            path="/inventory"
            element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}
          >
            <Route index element={<InventoryPage />} />
          </Route>

          {/* Management - Admin & Super Admin */}
          <Route
            path="/categories"
            element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}
          >
            <Route index element={<CategoriesPage />} />
          </Route>
          <Route
            path="/brands"
            element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}
          >
            <Route index element={<BrandsPage />} />
          </Route>
          <Route
            path="/suppliers"
            element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}
          >
            <Route index element={<SuppliersPage />} />
          </Route>
          <Route
            path="/reports"
            element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}
          >
            <Route index element={<ReportsPage />} />
          </Route>
          <Route
            path="/users"
            element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}
          >
            <Route index element={<UsersPage />} />
          </Route>
          <Route
            path="/settings"
            element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}
          >
            <Route index element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
