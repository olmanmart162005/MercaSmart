-- ============================================================
-- MERCASMART WEB — SCHEMA SUPABASE LIMPIO & 100% FUNCIONAL
-- Multi-Sucursal + Super Admin + Admin + Cajero
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ELIMINAR CUALQUIER TRIGGER QUE BLOQUEE SUPABASE AUTH
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. RESTAURAR PERMISOS TOTALES DE SUPABASE AUTH
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;

-- ============================================================
-- 3. TABLA: branches (Sucursales)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.branches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  address    TEXT DEFAULT '',
  phone      TEXT DEFAULT '',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asegurar columnas si existía previamente
ALTER TABLE IF EXISTS public.branches ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE IF EXISTS public.branches ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE IF EXISTS public.branches ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE IF EXISTS public.branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS public.branches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Insertar sucursal principal
INSERT INTO public.branches (id, code, name, address, phone, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'SUC-001',
  'Sucursal Principal',
  'Centro Comercial / Local Principal',
  '+504 2200-0000',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  code = 'SUC-001',
  name = 'Sucursal Principal';

-- ============================================================
-- 4. TABLA: profiles (Perfiles de Usuario)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE NOT NULL,
  full_name  TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'cashier',
  branch_id  UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE IF EXISTS public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'admin', 'cashier', 'Admin', 'Cajero', 'Empleado'));

-- ============================================================
-- 5. TABLAS OPERATIVAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  branch_id  UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE IF EXISTS public.categories ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.brands (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  rtn            TEXT DEFAULT '',
  phone          TEXT DEFAULT '',
  address        TEXT DEFAULT '',
  promotor       TEXT DEFAULT '',
  promotor_phone TEXT DEFAULT '',
  branch_id      UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE IF EXISTS public.suppliers ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.products (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT NOT NULL,
  barcode     TEXT DEFAULT '',
  name        TEXT NOT NULL,
  cost_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate    NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  stock       NUMERIC(12,3) NOT NULL DEFAULT 0,
  min_stock   NUMERIC(12,3) NOT NULL DEFAULT 5,
  category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id    BIGINT REFERENCES public.brands(id) ON DELETE SET NULL,
  supplier_id BIGINT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.customers (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  rtn        TEXT DEFAULT '',
  phone      TEXT DEFAULT '',
  address    TEXT DEFAULT '',
  debt       NUMERIC(12,2) NOT NULL DEFAULT 0,
  branch_id  UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

INSERT INTO public.customers (id, name, rtn, phone, address)
VALUES (1, 'Consumidor Final', '', '', '')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  initial_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  counted_amount  NUMERIC(12,2),
  difference      NUMERIC(12,2),
  total_sales     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cash      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_card      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_transfer  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_income    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_expense   NUMERIC(12,2) NOT NULL DEFAULT 0,
  sales_count     INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE IF EXISTS public.cash_sessions ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.cash_movements (
  id          BIGSERIAL PRIMARY KEY,
  session_id  BIGINT NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount      NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE IF EXISTS public.cash_movements ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.sales (
  id              BIGSERIAL PRIMARY KEY,
  invoice_number  TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  customer_id     BIGINT REFERENCES public.customers(id) ON DELETE SET NULL,
  cash_session_id BIGINT REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  branch_id       UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL DEFAULT 'Efectivo' CHECK (payment_method IN ('Efectivo', 'Tarjeta', 'Transferencia', 'Crédito')),
  cash_received   NUMERIC(12,2) NOT NULL DEFAULT 0,
  change_given    NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_cancelled    BOOLEAN NOT NULL DEFAULT FALSE,
  customer_name   TEXT DEFAULT '',
  customer_rtn    TEXT DEFAULT ''
);
ALTER TABLE IF EXISTS public.sales ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.sale_items (
  id          BIGSERIAL PRIMARY KEY,
  sale_id     BIGINT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity    NUMERIC(12,3) NOT NULL,
  price       NUMERIC(12,2) NOT NULL,
  tax_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  subtotal    NUMERIC(12,2) NOT NULL,
  discount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE CASCADE
);
ALTER TABLE IF EXISTS public.sale_items ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity     NUMERIC(12,3) NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('Entrada', 'Salida', 'Venta', 'Ajuste', 'Devolución')),
  remarks      TEXT DEFAULT '',
  user_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reference_id BIGINT,
  branch_id    UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE IF EXISTS public.inventory_transactions ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.configuration (
  key        TEXT NOT NULL,
  value      TEXT NOT NULL DEFAULT '',
  branch_id  UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE IF EXISTS public.configuration ADD COLUMN IF NOT EXISTS branch_id UUID;

INSERT INTO public.configuration (key, value, branch_id)
SELECT 'BusinessName', 'MercaSmart Supermercado', 'a0000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM public.configuration WHERE key = 'BusinessName');

INSERT INTO public.configuration (key, value, branch_id)
SELECT 'SAR_CAI', '7A2E89-F4D21C-8941AB-DE9C83-20F12E-5C', 'a0000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM public.configuration WHERE key = 'SAR_CAI');

INSERT INTO public.configuration (key, value, branch_id)
SELECT 'SAR_CurrentInvoice', '000-001-01-00000000', 'a0000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM public.configuration WHERE key = 'SAR_CurrentInvoice');

-- ============================================================
-- 6. RPC TRANSACCIONALES
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_sale(
  p_invoice_number TEXT, p_user_id UUID, p_customer_id BIGINT, p_cash_session_id BIGINT, p_branch_id UUID,
  p_subtotal NUMERIC, p_tax_amount NUMERIC, p_discount_amount NUMERIC, p_total NUMERIC,
  p_payment_method TEXT, p_cash_received NUMERIC, p_change_given NUMERIC,
  p_customer_name TEXT, p_customer_rtn TEXT, p_items JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sale_id BIGINT; v_item JSONB; v_product RECORD; v_curr_inv TEXT; v_parts TEXT[]; v_next BIGINT;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, name, stock INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::BIGINT FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado: %', v_item->>'product_id'; END IF;
    IF v_product.stock < (v_item->>'quantity')::NUMERIC THEN
      RAISE EXCEPTION 'Stock insuficiente para "%". Disponible: %, Solicitado: %', v_product.name, v_product.stock, (v_item->>'quantity')::NUMERIC;
    END IF;
  END LOOP;

  INSERT INTO public.sales (
    invoice_number, user_id, customer_id, cash_session_id, branch_id,
    subtotal, tax_amount, discount_amount, total,
    payment_method, cash_received, change_given, customer_name, customer_rtn
  ) VALUES (
    p_invoice_number, p_user_id, p_customer_id, p_cash_session_id, p_branch_id,
    p_subtotal, p_tax_amount, p_discount_amount, p_total,
    p_payment_method, p_cash_received, p_change_given, customer_name, customer_rtn
  ) RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.sale_items (sale_id, product_id, quantity, price, tax_rate, subtotal, discount, branch_id)
    VALUES (v_sale_id, (v_item->>'product_id')::BIGINT, (v_item->>'quantity')::NUMERIC, (v_item->>'price')::NUMERIC, (v_item->>'tax_rate')::NUMERIC, (v_item->>'subtotal')::NUMERIC, COALESCE((v_item->>'discount')::NUMERIC, 0), p_branch_id);

    UPDATE public.products SET stock = stock - (v_item->>'quantity')::NUMERIC, updated_at = NOW() WHERE id = (v_item->>'product_id')::BIGINT;

    INSERT INTO public.inventory_transactions (product_id, quantity, type, remarks, user_id, reference_id, branch_id)
    VALUES ((v_item->>'product_id')::BIGINT, (v_item->>'quantity')::NUMERIC, 'Venta', 'Factura #' || p_invoice_number, p_user_id, v_sale_id, p_branch_id);
  END LOOP;

  IF p_cash_session_id IS NOT NULL THEN
    UPDATE public.cash_sessions SET
      total_sales = total_sales + p_total,
      total_cash = total_cash + CASE WHEN p_payment_method = 'Efectivo' THEN p_total ELSE 0 END,
      total_card = total_card + CASE WHEN p_payment_method = 'Tarjeta' THEN p_total ELSE 0 END,
      total_transfer = total_transfer + CASE WHEN p_payment_method = 'Transferencia' THEN p_total ELSE 0 END,
      sales_count = sales_count + 1 WHERE id = p_cash_session_id;
  END IF;

  IF p_payment_method = 'Crédito' AND p_customer_id IS NOT NULL AND p_customer_id != 1 THEN
    UPDATE public.customers SET debt = debt + p_total, updated_at = NOW() WHERE id = p_customer_id;
  END IF;

  SELECT value INTO v_curr_inv FROM public.configuration WHERE key = 'SAR_CurrentInvoice' AND (branch_id = p_branch_id OR branch_id IS NULL) LIMIT 1;
  IF v_curr_inv IS NOT NULL AND v_curr_inv LIKE '%-%-%-%' THEN
    v_parts := string_to_array(v_curr_inv, '-');
    v_next := CAST(v_parts[4] AS BIGINT) + 1;
    UPDATE public.configuration SET value = v_parts[1] || '-' || v_parts[2] || '-' || v_parts[3] || '-' || LPAD(v_next::TEXT, 8, '0'), updated_at = NOW()
    WHERE key = 'SAR_CurrentInvoice' AND (branch_id = p_branch_id OR branch_id IS NULL);
  END IF;

  RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id, 'invoice_number', p_invoice_number);
END; $$;

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_branch_id UUID DEFAULT 'a0000000-0000-0000-0000-000000000001')
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_current TEXT; v_parts TEXT[]; v_next BIGINT;
BEGIN
  SELECT value INTO v_current FROM public.configuration WHERE key = 'SAR_CurrentInvoice' AND (branch_id = p_branch_id OR branch_id IS NULL) LIMIT 1;
  IF v_current IS NULL OR v_current NOT LIKE '%-%-%-%' THEN v_current := '000-001-01-00000000'; END IF;
  v_parts := string_to_array(v_current, '-');
  v_next := CAST(v_parts[4] AS BIGINT) + 1;
  RETURN v_parts[1] || '-' || v_parts[2] || '-' || v_parts[3] || '-' || LPAD(v_next::TEXT, 8, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.close_cash_session(p_session_id BIGINT, p_counted_amount NUMERIC, p_notes TEXT DEFAULT '')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session RECORD; v_expected NUMERIC;
BEGIN
  SELECT * INTO v_session FROM public.cash_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno no encontrado'; END IF;
  IF v_session.status = 'closed' THEN RAISE EXCEPTION 'El turno ya está cerrado'; END IF;
  v_expected := v_session.initial_amount + v_session.total_cash + v_session.total_income - v_session.total_expense;
  UPDATE public.cash_sessions SET status = 'closed', closed_at = NOW(), counted_amount = p_counted_amount, expected_amount = v_expected, difference = p_counted_amount - v_expected, notes = p_notes WHERE id = p_session_id;
  RETURN jsonb_build_object('success', true, 'difference', p_counted_amount - v_expected);
END; $$;
