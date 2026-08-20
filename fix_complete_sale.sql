-- ============================================================
-- MERCASMART: CORRECCIÓN DE GENERACIÓN DE NÚMEROS DE FACTURA
-- Ejecutar en Supabase -> SQL Editor para garantizar que nunca
-- vuelva a salir el error de duplicate key en facturación
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_branch_id UUID DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_next BIGINT;
  v_prefix TEXT := '000-001-01-';
  v_cai_prefix TEXT;
BEGIN
  -- 1. Intentar obtener el prefijo desde configuration si existe
  SELECT SUBSTRING(value FROM 1 FOR 11) INTO v_cai_prefix
  FROM public.configuration
  WHERE key = 'SAR_RangeMin'
  LIMIT 1;

  IF v_cai_prefix IS NOT NULL AND v_cai_prefix LIKE '%-%-%-' THEN
    v_prefix := v_cai_prefix;
  END IF;

  -- 2. Calcular el siguiente número basado en el número total de ventas o el id más alto
  SELECT COALESCE(MAX(id), 0) + 1 INTO v_next FROM public.sales;

  RETURN v_prefix || LPAD(v_next::TEXT, 8, '0');
END; $$;

-- Actualizar función complete_sale para sincronizar siempre el número actual
CREATE OR REPLACE FUNCTION public.complete_sale(
  p_invoice_number TEXT, p_user_id UUID, p_customer_id BIGINT, p_cash_session_id BIGINT, p_branch_id UUID,
  p_subtotal NUMERIC, p_tax_amount NUMERIC, p_discount_amount NUMERIC, p_total NUMERIC,
  p_payment_method TEXT, p_cash_received NUMERIC, p_change_given NUMERIC,
  p_customer_name TEXT, p_customer_rtn TEXT, p_items JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sale_id BIGINT;
  v_item JSONB;
  v_product RECORD;
BEGIN
  -- 1. Validar existencia y stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, name, stock INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::BIGINT FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado: %', v_item->>'product_id';
    END IF;
    IF v_product.stock < (v_item->>'quantity')::NUMERIC THEN
      RAISE EXCEPTION 'Stock insuficiente para "%". Disponible: %, Solicitado: %', v_product.name, v_product.stock, (v_item->>'quantity')::NUMERIC;
    END IF;
  END LOOP;

  -- 2. Insertar venta
  INSERT INTO public.sales (
    invoice_number, user_id, customer_id, cash_session_id, branch_id,
    subtotal, tax_amount, discount_amount, total,
    payment_method, cash_received, change_given, customer_name, customer_rtn
  ) VALUES (
    p_invoice_number, p_user_id, p_customer_id, p_cash_session_id, p_branch_id,
    p_subtotal, p_tax_amount, p_discount_amount, p_total,
    p_payment_method, p_cash_received, p_change_given, p_customer_name, p_customer_rtn
  ) RETURNING id INTO v_sale_id;

  -- 3. Insertar items y rebajar inventario
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.sale_items (
      sale_id, product_id, quantity, price, tax_rate, subtotal, discount, branch_id
    ) VALUES (
      v_sale_id,
      (v_item->>'product_id')::BIGINT,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'price')::NUMERIC,
      (v_item->>'tax_rate')::NUMERIC,
      (v_item->>'subtotal')::NUMERIC,
      COALESCE((v_item->>'discount')::NUMERIC, 0),
      p_branch_id
    );

    UPDATE public.products
    SET stock = stock - (v_item->>'quantity')::NUMERIC, updated_at = NOW()
    WHERE id = (v_item->>'product_id')::BIGINT;

    INSERT INTO public.inventory_transactions (
      product_id, quantity, type, remarks, user_id, reference_id, branch_id
    ) VALUES (
      (v_item->>'product_id')::BIGINT,
      (v_item->>'quantity')::NUMERIC,
      'Venta',
      'Factura #' || p_invoice_number,
      p_user_id,
      v_sale_id,
      p_branch_id
    );
  END LOOP;

  -- 4. Actualizar sesión de caja
  IF p_cash_session_id IS NOT NULL THEN
    UPDATE public.cash_sessions SET
      total_sales = total_sales + p_total,
      total_cash = total_cash + CASE WHEN p_payment_method = 'Efectivo' THEN p_total ELSE 0 END,
      total_card = total_card + CASE WHEN p_payment_method = 'Tarjeta' THEN p_total ELSE 0 END,
      total_transfer = total_transfer + CASE WHEN p_payment_method = 'Transferencia' THEN p_total ELSE 0 END,
      sales_count = sales_count + 1
    WHERE id = p_cash_session_id;
  END IF;

  -- 5. Actualizar deuda de cliente si fue a crédito
  IF p_payment_method = 'Crédito' AND p_customer_id IS NOT NULL AND p_customer_id != 1 THEN
    UPDATE public.customers
    SET debt = debt + p_total, updated_at = NOW()
    WHERE id = p_customer_id;
  END IF;

  -- 6. Actualizar configuración SAR_CurrentInvoice
  UPDATE public.configuration
  SET value = p_invoice_number, updated_at = NOW()
  WHERE key = 'SAR_CurrentInvoice';

  RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id, 'invoice_number', p_invoice_number);
END; $$;
