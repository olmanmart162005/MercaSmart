-- ============================================================
-- MERCASMART WEB — FIX DEFINITIVO DE CONFIRMACIÓN Y PERMISOS RLS
-- ============================================================

-- 1. AUTO-CONFIRMAR TODOS LOS USUARIOS EXISTENTES
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

-- 2. TRIGGER LIGERO PARA AUTO-CONFIRMAR NUEVOS USUARIOS SIEMPRE
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_confirm_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_user();

-- 3. PERMISOS Y POLÍTICAS RLS ABIERTAS PARA PROFILES Y TODAS LAS TABLAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
CREATE POLICY "Public profiles access" ON public.profiles
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public branches access" ON public.branches;
CREATE POLICY "Public branches access" ON public.branches
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public categories access" ON public.categories;
CREATE POLICY "Public categories access" ON public.categories
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public brands access" ON public.brands;
CREATE POLICY "Public brands access" ON public.brands
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public suppliers access" ON public.suppliers;
CREATE POLICY "Public suppliers access" ON public.suppliers
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public products access" ON public.products;
CREATE POLICY "Public products access" ON public.products
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public customers access" ON public.customers;
CREATE POLICY "Public customers access" ON public.customers
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public cash_sessions access" ON public.cash_sessions;
CREATE POLICY "Public cash_sessions access" ON public.cash_sessions
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public cash_movements access" ON public.cash_movements;
CREATE POLICY "Public cash_movements access" ON public.cash_movements
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public sales access" ON public.sales;
CREATE POLICY "Public sales access" ON public.sales
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public sale_items access" ON public.sale_items;
CREATE POLICY "Public sale_items access" ON public.sale_items
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public inventory_transactions access" ON public.inventory_transactions;
CREATE POLICY "Public inventory_transactions access" ON public.inventory_transactions
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.configuration ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public configuration access" ON public.configuration;
CREATE POLICY "Public configuration access" ON public.configuration
  FOR ALL TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Otorgar permisos globales
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
