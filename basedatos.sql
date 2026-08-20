-- ============================================================
-- MERCASMART WEB — SUPABASE SCHEMA
-- Copiar y pegar completo en el SQL Editor de Supabase
-- ============================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: branches (Sucursales — preparado para futuro)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.branches (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  address    TEXT DEFAULT '',
  phone      TEXT DEFAULT '',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar sucursal principal
INSERT INTO public.branches (id, name, address, phone)
VALUES ('00000000-0000-0000-0000-000000000001', 'Sucursal Principal', '', '')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABLA: profiles (Usuarios — vinculada a auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE NOT NULL,
  full_name  TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'Cajero' CHECK (role IN ('Admin', 'Cajero', 'Empleado')),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  branch_id  UUID REFERENCES public.branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: categories (Categorías)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  branch_id  UUID REFERENCES public.branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: brands (Marcas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.brands (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: suppliers (Proveedores)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  rtn            TEXT DEFAULT '',
  phone          TEXT DEFAULT '',
  address        TEXT DEFAULT '',
  promotor       TEXT DEFAULT '',
  promotor_phone TEXT DEFAULT '',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: products (Productos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  barcode     TEXT DEFAULT '',
  name        TEXT NOT NULL,
  cost_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate    NUMERIC(5,2) NOT NULL DEFAULT 15.00, -- 0, 15, 18
  stock       NUMERIC(12,3) NOT NULL DEFAULT 0,
  min_stock   NUMERIC(12,3) NOT NULL DEFAULT 5,
  category_id BIGINT REFERENCES public.categories(id),
  brand_id    BIGINT REFERENCES public.brands(id),
  supplier_id BIGINT REFERENCES public.suppliers(id),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  branch_id   UUID REFERENCES public.branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: customers (Clientes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  rtn        TEXT DEFAULT '',
  phone      TEXT DEFAULT '',
  address    TEXT DEFAULT '',
  debt       NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar cliente "Consumidor Final"
INSERT INTO public.customers (id, name, rtn, phone, address)
VALUES (1, 'Consumidor Final', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABLA: cash_sessions (Turnos de caja)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  branch_id       UUID NOT NULL REFERENCES public.branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
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

-- ============================================================
-- TABLA: cash_movements (Ingresos/egresos de caja)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id          BIGSERIAL PRIMARY KEY,
  session_id  BIGINT NOT NULL REFERENCES public.cash_sessions(id),
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount      NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: sales (Ventas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id              BIGSERIAL PRIMARY KEY,
  invoice_number  TEXT UNIQUE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  customer_id     BIGINT REFERENCES public.customers(id),
  cash_session_id BIGINT REFERENCES public.cash_sessions(id),
  branch_id       UUID REFERENCES public.branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
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

-- ============================================================
-- TABLA: sale_items (Detalle de ventas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sale_items (
  id          BIGSERIAL PRIMARY KEY,
  sale_id     BIGINT NOT NULL REFERENCES public.sales(id),
  product_id  BIGINT NOT NULL REFERENCES public.products(id),
  quantity    NUMERIC(12,3) NOT NULL,
  price       NUMERIC(12,2) NOT NULL,
  tax_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  subtotal    NUMERIC(12,2) NOT NULL,
  discount    NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLA: inventory_transactions (Movimientos de inventario)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT NOT NULL REFERENCES public.products(id),
  quantity     NUMERIC(12,3) NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('Entrada', 'Salida', 'Venta', 'Ajuste', 'Devolución')),
  remarks      TEXT DEFAULT '',
  user_id      UUID REFERENCES public.profiles(id),
  reference_id BIGINT, -- sale_id u otra referencia
  branch_id    UUID REFERENCES public.branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: configuration (Configuración del negocio)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.configuration (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  branch_id  UUID REFERENCES public.branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datos iniciales de configuración
INSERT INTO public.configuration (key, value) VALUES
  ('BusinessName',        'MercaSmart'),
  ('BusinessRTN',         ''),
  ('BusinessAddress',     ''),
  ('BusinessPhone',       ''),
  ('SAR_CAI',             '7A2E89-F4D21C-8941AB-DE9C83-20F12E-5C'),
  ('SAR_RangeMin',        '000-001-01-00000001'),
  ('SAR_RangeMax',        '000-001-01-00100000'),
  ('SAR_CurrentInvoice',  '000-001-01-00000000'),
  ('SAR_DeadlineDate',    '2027-12-31'),
  ('TicketHeader',        '★ MERCASMART ★'),
  ('TicketFooter',        E'Exija su Factura Fiscal\n¡Gracias por su preferencia!'),
  ('IsSetupCompleted',    'false')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- TABLA: customer_payments (Abonos — preparado para futuro)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id          BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES public.customers(id),
  amount      NUMERIC(12,2) NOT NULL,
  notes       TEXT DEFAULT '',
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DATOS SEMILLA: Categorías
-- ============================================================
INSERT INTO public.categories (name) VALUES
  ('Abarrotes'), ('Bebidas'), ('Lácteos'), ('Snacks'),
  ('Panadería'), ('Carnes'), ('Limpieza'), ('Higiene Personal')
ON CONFLICT DO NOTHING;

-- ============================================================
-- DATOS SEMILLA: Proveedores
-- ============================================================
INSERT INTO public.suppliers (name) VALUES
  ('Pepsi'), ('Coca-Cola'), ('Dinant'), ('Leyde'), ('Sula'),
  ('Nestlé'), ('Bimbo'), ('Yummies'), ('Kimberly-Clark'), ('Unilever')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_branch ON public.products(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_session ON public.sales(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created ON public.inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user ON public.cash_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.cash_sessions(status);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TRIGGER: Crear perfil automáticamente al registrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Cajero')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCIÓN RPC: complete_sale (transacción atómica de venta)
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_sale(
  p_invoice_number  TEXT,
  p_user_id         UUID,
  p_customer_id     BIGINT,
  p_cash_session_id BIGINT,
  p_branch_id       UUID,
  p_subtotal        NUMERIC,
  p_tax_amount      NUMERIC,
  p_discount_amount NUMERIC,
  p_total           NUMERIC,
  p_payment_method  TEXT,
  p_cash_received   NUMERIC,
  p_change_given    NUMERIC,
  p_customer_name   TEXT,
  p_customer_rtn    TEXT,
  p_items           JSONB  -- [{product_id, quantity, price, tax_rate, subtotal, discount}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id   BIGINT;
  v_item      JSONB;
  v_product   RECORD;
  v_result    JSONB;
BEGIN
  -- 1. Verificar stock de todos los productos
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, name, stock
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::BIGINT
    FOR UPDATE; -- bloquear fila para evitar race conditions

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado: %', v_item->>'product_id';
    END IF;

    IF v_product.stock < (v_item->>'quantity')::NUMERIC THEN
      RAISE EXCEPTION 'Stock insuficiente para "%". Disponible: %, Solicitado: %',
        v_product.name, v_product.stock, (v_item->>'quantity')::NUMERIC;
    END IF;
  END LOOP;

  -- 2. Crear la venta
  INSERT INTO public.sales (
    invoice_number, user_id, customer_id, cash_session_id, branch_id,
    subtotal, tax_amount, discount_amount, total,
    payment_method, cash_received, change_given,
    customer_name, customer_rtn
  ) VALUES (
    p_invoice_number, p_user_id, p_customer_id, p_cash_session_id, p_branch_id,
    p_subtotal, p_tax_amount, p_discount_amount, p_total,
    p_payment_method, p_cash_received, p_change_given,
    p_customer_name, p_customer_rtn
  )
  RETURNING id INTO v_sale_id;

  -- 3. Crear detalle de venta + actualizar stock + movimiento de inventario
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- 3a. Insertar item de venta
    INSERT INTO public.sale_items (
      sale_id, product_id, quantity, price, tax_rate, subtotal, discount
    ) VALUES (
      v_sale_id,
      (v_item->>'product_id')::BIGINT,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'price')::NUMERIC,
      (v_item->>'tax_rate')::NUMERIC,
      (v_item->>'subtotal')::NUMERIC,
      COALESCE((v_item->>'discount')::NUMERIC, 0)
    );

    -- 3b. Descontar stock
    UPDATE public.products
    SET stock = stock - (v_item->>'quantity')::NUMERIC,
        updated_at = NOW()
    WHERE id = (v_item->>'product_id')::BIGINT;

    -- 3c. Registrar movimiento de inventario
    INSERT INTO public.inventory_transactions (
      product_id, quantity, type, remarks, user_id, reference_id, branch_id
    ) VALUES (
      (v_item->>'product_id')::BIGINT,
      (v_item->>'quantity')::NUMERIC,
      'Venta',
      'Venta #' || p_invoice_number,
      p_user_id,
      v_sale_id,
      p_branch_id
    );
  END LOOP;

  -- 4. Actualizar totales del turno de caja
  UPDATE public.cash_sessions
  SET
    total_sales    = total_sales + p_total,
    total_cash     = total_cash + CASE WHEN p_payment_method = 'Efectivo' THEN p_total ELSE 0 END,
    total_card     = total_card + CASE WHEN p_payment_method = 'Tarjeta' THEN p_total ELSE 0 END,
    total_transfer = total_transfer + CASE WHEN p_payment_method = 'Transferencia' THEN p_total ELSE 0 END,
    expected_amount = initial_amount + total_sales + total_income - total_expense +
                      CASE WHEN p_payment_method = 'Efectivo' THEN p_total ELSE 0 END,
    sales_count    = sales_count + 1
  WHERE id = p_cash_session_id;

  -- 5. Actualizar deuda del cliente si es crédito
  IF p_payment_method = 'Crédito' AND p_customer_id IS NOT NULL AND p_customer_id != 1 THEN
    UPDATE public.customers
    SET debt = debt + p_total,
        updated_at = NOW()
    WHERE id = p_customer_id;
  END IF;

  -- 6. Avanzar número de factura SAR
  UPDATE public.configuration
  SET value = (
    SELECT CONCAT(
      split_part(value, '-', 1), '-',
      split_part(value, '-', 2), '-',
      split_part(value, '-', 3), '-',
      LPAD((CAST(split_part(value, '-', 4) AS BIGINT) + 1)::TEXT, 8, '0')
    )
    FROM public.configuration WHERE key = 'SAR_CurrentInvoice'
  ),
  updated_at = NOW()
  WHERE key = 'SAR_CurrentInvoice';

  v_result := jsonb_build_object('success', true, 'sale_id', v_sale_id, 'invoice_number', p_invoice_number);
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ============================================================
-- FUNCIÓN RPC: get_next_invoice_number
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current TEXT;
  v_parts   TEXT[];
  v_next    BIGINT;
  v_result  TEXT;
BEGIN
  SELECT value INTO v_current FROM public.configuration WHERE key = 'SAR_CurrentInvoice';

  v_parts := string_to_array(v_current, '-');
  v_next  := CAST(v_parts[4] AS BIGINT) + 1;

  v_result := v_parts[1] || '-' || v_parts[2] || '-' || v_parts[3] || '-' || LPAD(v_next::TEXT, 8, '0');
  RETURN v_result;
END;
$$;

-- ============================================================
-- FUNCIÓN RPC: cancel_sale (Cancelar venta y restaurar stock)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_sale(
  p_sale_id  BIGINT,
  p_user_id  UUID,
  p_reason   TEXT DEFAULT 'Cancelación manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale    RECORD;
  v_item    RECORD;
BEGIN
  -- Verificar que la venta existe y no está cancelada
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada';
  END IF;

  IF v_sale.is_cancelled THEN
    RAISE EXCEPTION 'La venta ya está cancelada';
  END IF;

  -- Marcar como cancelada
  UPDATE public.sales SET is_cancelled = TRUE WHERE id = p_sale_id;

  -- Restaurar stock y registrar movimientos
  FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
  LOOP
    UPDATE public.products
    SET stock = stock + v_item.quantity, updated_at = NOW()
    WHERE id = v_item.product_id;

    INSERT INTO public.inventory_transactions (
      product_id, quantity, type, remarks, user_id, reference_id, branch_id
    ) VALUES (
      v_item.product_id, v_item.quantity, 'Devolución',
      'Cancelación venta #' || (SELECT invoice_number FROM public.sales WHERE id = p_sale_id),
      p_user_id, p_sale_id, v_sale.branch_id
    );
  END LOOP;

  -- Actualizar totales del turno de caja
  IF v_sale.cash_session_id IS NOT NULL THEN
    UPDATE public.cash_sessions
    SET
      total_sales    = total_sales - v_sale.total,
      total_cash     = total_cash - CASE WHEN v_sale.payment_method = 'Efectivo' THEN v_sale.total ELSE 0 END,
      total_card     = total_card - CASE WHEN v_sale.payment_method = 'Tarjeta' THEN v_sale.total ELSE 0 END,
      total_transfer = total_transfer - CASE WHEN v_sale.payment_method = 'Transferencia' THEN v_sale.total ELSE 0 END,
      sales_count    = GREATEST(sales_count - 1, 0)
    WHERE id = v_sale.cash_session_id;
  END IF;

  -- Revertir deuda del cliente si era crédito
  IF v_sale.payment_method = 'Crédito' AND v_sale.customer_id IS NOT NULL AND v_sale.customer_id != 1 THEN
    UPDATE public.customers
    SET debt = GREATEST(debt - v_sale.total, 0), updated_at = NOW()
    WHERE id = v_sale.customer_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'sale_id', p_sale_id);
END;
$$;

-- ============================================================
-- FUNCIÓN RPC: close_cash_session (Cierre de caja)
-- ============================================================
CREATE OR REPLACE FUNCTION public.close_cash_session(
  p_session_id    BIGINT,
  p_counted_amount NUMERIC,
  p_notes         TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_expected NUMERIC;
BEGIN
  SELECT * INTO v_session FROM public.cash_sessions WHERE id = p_session_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turno de caja no encontrado';
  END IF;

  IF v_session.status = 'closed' THEN
    RAISE EXCEPTION 'El turno ya está cerrado';
  END IF;

  v_expected := v_session.initial_amount + v_session.total_cash + v_session.total_income - v_session.total_expense;

  UPDATE public.cash_sessions
  SET
    status          = 'closed',
    closed_at       = NOW(),
    counted_amount  = p_counted_amount,
    expected_amount = v_expected,
    difference      = p_counted_amount - v_expected,
    notes           = p_notes
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'expected_amount', v_expected,
    'counted_amount', p_counted_amount,
    'difference', p_counted_amount - v_expected
  );
END;
$$;

-- ============================================================
-- FUNCIÓN RPC: adjust_inventory (Ajuste manual de inventario)
-- ============================================================
CREATE OR REPLACE FUNCTION public.adjust_inventory(
  p_product_id BIGINT,
  p_quantity   NUMERIC,
  p_type       TEXT,  -- 'Entrada', 'Salida', 'Ajuste'
  p_remarks    TEXT,
  p_user_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product RECORD;
  v_new_stock NUMERIC;
BEGIN
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  IF p_type = 'Salida' THEN
    v_new_stock := v_product.stock - p_quantity;
    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'Stock insuficiente. Disponible: %', v_product.stock;
    END IF;
  ELSIF p_type = 'Ajuste' THEN
    v_new_stock := p_quantity; -- Ajuste directo al valor especificado
  ELSE -- Entrada
    v_new_stock := v_product.stock + p_quantity;
  END IF;

  UPDATE public.products
  SET stock = v_new_stock, updated_at = NOW()
  WHERE id = p_product_id;

  INSERT INTO public.inventory_transactions (
    product_id, quantity, type, remarks, user_id, branch_id
  ) VALUES (
    p_product_id,
    ABS(p_quantity),
    p_type,
    p_remarks,
    p_user_id,
    v_product.branch_id
  );

  RETURN jsonb_build_object('success', true, 'new_stock', v_new_stock);
END;
$$;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Función helper para verificar si es Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin' AND is_active = TRUE);
$$;

-- ---- POLICIES: profiles ----
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- ---- POLICIES: branches ----
CREATE POLICY "branches_read_all" ON public.branches
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "branches_write_admin" ON public.branches
  FOR ALL USING (public.is_admin());

-- ---- POLICIES: categories ----
CREATE POLICY "categories_read_all" ON public.categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "categories_write_admin" ON public.categories
  FOR ALL USING (public.is_admin());

-- ---- POLICIES: brands ----
CREATE POLICY "brands_read_all" ON public.brands
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "brands_write_admin" ON public.brands
  FOR ALL USING (public.is_admin());

-- ---- POLICIES: suppliers ----
CREATE POLICY "suppliers_read_all" ON public.suppliers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "suppliers_write_admin" ON public.suppliers
  FOR ALL USING (public.is_admin());

-- ---- POLICIES: products ----
CREATE POLICY "products_read_all" ON public.products
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "products_write_admin_empleado" ON public.products
  FOR ALL USING (
    public.get_user_role() IN ('Admin', 'Empleado')
  );

-- ---- POLICIES: customers ----
CREATE POLICY "customers_read_auth" ON public.customers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "customers_write_auth" ON public.customers
  FOR ALL USING (
    public.get_user_role() IN ('Admin', 'Cajero')
  );

-- ---- POLICIES: cash_sessions ----
CREATE POLICY "cash_sessions_admin_all" ON public.cash_sessions
  FOR ALL USING (public.is_admin());

CREATE POLICY "cash_sessions_cajero_own" ON public.cash_sessions
  FOR ALL USING (
    public.get_user_role() = 'Cajero' AND user_id = auth.uid()
  );

-- ---- POLICIES: cash_movements ----
CREATE POLICY "cash_movements_admin_all" ON public.cash_movements
  FOR ALL USING (public.is_admin());

CREATE POLICY "cash_movements_cajero_own" ON public.cash_movements
  FOR ALL USING (
    public.get_user_role() = 'Cajero' AND
    session_id IN (SELECT id FROM public.cash_sessions WHERE user_id = auth.uid())
  );

-- ---- POLICIES: sales ----
CREATE POLICY "sales_admin_all" ON public.sales
  FOR ALL USING (public.is_admin());

CREATE POLICY "sales_cajero_own" ON public.sales
  FOR ALL USING (
    public.get_user_role() IN ('Cajero', 'Empleado') AND user_id = auth.uid()
  );

-- ---- POLICIES: sale_items ----
CREATE POLICY "sale_items_admin_all" ON public.sale_items
  FOR ALL USING (public.is_admin());

CREATE POLICY "sale_items_cajero_own" ON public.sale_items
  FOR ALL USING (
    sale_id IN (SELECT id FROM public.sales WHERE user_id = auth.uid())
  );

-- ---- POLICIES: inventory_transactions ----
CREATE POLICY "inventory_read_all" ON public.inventory_transactions
  FOR SELECT USING (
    public.get_user_role() IN ('Admin', 'Empleado')
  );

CREATE POLICY "inventory_write_admin_empleado" ON public.inventory_transactions
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('Admin', 'Empleado')
  );

-- ---- POLICIES: configuration ----
CREATE POLICY "config_read_all" ON public.configuration
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "config_write_admin" ON public.configuration
  FOR ALL USING (public.is_admin());

-- ---- POLICIES: customer_payments ----
CREATE POLICY "payments_admin_all" ON public.customer_payments
  FOR ALL USING (public.is_admin());

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
