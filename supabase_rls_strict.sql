-- ============================================================
-- MERCASMART — SCRIPT SQL: RLS ESTRICTO + COLUMNAS NUEVAS
-- Ejecutar en Supabase SQL Editor
-- SEGURO: No elimina datos. Solo agrega columnas y políticas.
-- ============================================================

-- ============================================================
-- PARTE 1: AGREGAR COLUMNAS NUEVAS (idempotente)
-- ============================================================

-- Logo de sucursal (para identidad visual por sucursal)
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS rtn TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS website TEXT;

-- Avatar de usuario (para Mi Perfil)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Configuración SAR por sucursal (si no existe como tabla, se usa la de configuration)
-- La tabla configuration ya existe con branch_id, se usará así.

-- Marcas: agregar branch_id si no existe
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Cash movements: asegurar branch_id
ALTER TABLE public.cash_movements ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- ============================================================
-- PARTE 2: FUNCIÓN HELPER para obtener el branch_id del usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- PARTE 3: POLÍTICAS RLS ESTRICTAS POR SUCURSAL
-- ============================================================

-- ---- BRANCHES ----
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branches_select" ON public.branches;
DROP POLICY IF EXISTS "branches_insert" ON public.branches;
DROP POLICY IF EXISTS "branches_update" ON public.branches;
DROP POLICY IF EXISTS "branches_delete" ON public.branches;

-- Todos los usuarios autenticados pueden leer sucursales (para el selector)
CREATE POLICY "branches_select" ON public.branches
  FOR SELECT TO authenticated USING (true);

-- Solo super_admin puede crear, editar o eliminar sucursales
CREATE POLICY "branches_insert" ON public.branches
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'super_admin');
CREATE POLICY "branches_update" ON public.branches
  FOR UPDATE TO authenticated USING (public.get_my_role() = 'super_admin');
CREATE POLICY "branches_delete" ON public.branches
  FOR DELETE TO authenticated USING (public.get_my_role() = 'super_admin');

-- ---- PROFILES ----
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

-- Super admin ve todos; admin ve su sucursal; usuario ve su propio perfil
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
    OR id = auth.uid()
  );
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (
    public.get_my_role() IN ('super_admin', 'admin')
    OR id = auth.uid()
  );
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'admin' AND branch_id = public.get_my_branch_id())
    OR id = auth.uid()
  );
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'admin' AND branch_id = public.get_my_branch_id())
  );

-- ---- CATEGORIES ----
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_policy" ON public.categories;
CREATE POLICY "categories_policy" ON public.categories
  FOR ALL TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR branch_id IS NULL
    OR branch_id = public.get_my_branch_id()
  ) WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  );

-- ---- BRANDS ----
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brands_policy" ON public.brands;
CREATE POLICY "brands_policy" ON public.brands
  FOR ALL TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR branch_id IS NULL
    OR branch_id = public.get_my_branch_id()
  ) WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
    OR branch_id IS NULL
  );

-- ---- SUPPLIERS ----
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suppliers_policy" ON public.suppliers;
CREATE POLICY "suppliers_policy" ON public.suppliers
  FOR ALL TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  ) WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  );

-- ---- CUSTOMERS ----
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_policy" ON public.customers;
CREATE POLICY "customers_policy" ON public.customers
  FOR ALL TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  ) WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  );

-- ---- PRODUCTS ----
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_policy" ON public.products;
CREATE POLICY "products_policy" ON public.products
  FOR ALL TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  ) WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  );

-- ---- SALES ----
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_policy" ON public.sales;
CREATE POLICY "sales_policy" ON public.sales
  FOR ALL TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  ) WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  );

-- ---- SALE_ITEMS ----
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sale_items_policy" ON public.sale_items;
CREATE POLICY "sale_items_policy" ON public.sale_items
  FOR ALL TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  ) WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  );

-- ---- CASH_SESSIONS ----
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cash_sessions_policy" ON public.cash_sessions;
CREATE POLICY "cash_sessions_policy" ON public.cash_sessions
  FOR ALL TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  ) WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  );

-- ---- CASH_MOVEMENTS ----
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cash_movements_policy" ON public.cash_movements;
CREATE POLICY "cash_movements_policy" ON public.cash_movements
  FOR ALL TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  ) WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  );

-- ---- INVENTORY_TRANSACTIONS ----
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_transactions_policy" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_policy" ON public.inventory_transactions
  FOR ALL TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  ) WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  );

-- ---- CONFIGURATION ----
ALTER TABLE public.configuration ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "configuration_policy" ON public.configuration;
CREATE POLICY "configuration_policy" ON public.configuration
  FOR ALL TO authenticated USING (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
    OR branch_id IS NULL
  ) WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR branch_id = public.get_my_branch_id()
  );

-- ============================================================
-- PARTE 4: PERMISOS DE EJECUCIÓN
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_my_branch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ============================================================
-- PARTE 5: ASEGURAR CLIENTE CONSUMIDOR FINAL (ID=1) VISIBLE
-- ============================================================
-- El cliente "Consumidor Final" con ID=1 debe ser visible en todas las sucursales
-- Actualizar su branch_id al branch principal para que no quede huérfano
UPDATE public.customers SET branch_id = (
  SELECT id FROM public.branches ORDER BY created_at ASC LIMIT 1
) WHERE id = 1 AND branch_id IS NULL;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
-- SIGUIENTE PASO: Ir a Supabase Dashboard → Storage y crear 2 buckets públicos:
-- 1. "branch-logos" (para logos de sucursales)
-- 2. "avatars"       (para fotos de perfil de usuarios)
-- ============================================================
