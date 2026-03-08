
-- 1. Audit Logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developer can view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'developer'::app_role));

CREATE POLICY "Central admin can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'central_admin'::app_role));

CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2. Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can create invoices" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'developer'::app_role) OR
    has_role(auth.uid(), 'central_admin'::app_role) OR
    has_role(auth.uid(), 'branch_admin'::app_role) OR
    has_role(auth.uid(), 'billing'::app_role)
  );

-- Invoice number generator
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_number TEXT;
  today_prefix TEXT;
  sequence_num INTEGER;
BEGIN
  today_prefix := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 14) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.invoices
  WHERE invoice_number LIKE today_prefix || '-%';
  
  new_number := today_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- 3. Refunds table
CREATE TYPE public.refund_status AS ENUM ('requested', 'approved', 'rejected');

CREATE TABLE public.refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status public.refund_status NOT NULL DEFAULT 'requested',
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view refunds" ON public.refunds
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'developer'::app_role) OR
    has_role(auth.uid(), 'central_admin'::app_role) OR
    has_role(auth.uid(), 'branch_admin'::app_role) OR
    requested_by = auth.uid()
  );

CREATE POLICY "Staff can request refunds" ON public.refunds
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'developer'::app_role) OR
    has_role(auth.uid(), 'central_admin'::app_role) OR
    has_role(auth.uid(), 'branch_admin'::app_role) OR
    has_role(auth.uid(), 'billing'::app_role)
  );

CREATE POLICY "Admins can update refunds" ON public.refunds
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'developer'::app_role) OR
    has_role(auth.uid(), 'central_admin'::app_role)
  );

-- 4. Customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view customers" ON public.customers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can manage customers" ON public.customers
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'developer'::app_role) OR
    has_role(auth.uid(), 'central_admin'::app_role) OR
    has_role(auth.uid(), 'branch_admin'::app_role) OR
    has_role(auth.uid(), 'billing'::app_role)
  );

-- Add payment validation trigger (tamper protection)
CREATE OR REPLACE FUNCTION public.validate_payment_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_total NUMERIC;
  total_paid NUMERIC;
BEGIN
  SELECT total INTO order_total FROM public.orders WHERE id = NEW.order_id;
  SELECT COALESCE(SUM(amount), 0) INTO total_paid FROM public.payments WHERE order_id = NEW.order_id;
  
  IF (total_paid + NEW.amount) > (order_total * 1.01) THEN
    RAISE EXCEPTION 'Payment amount exceeds order total';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_payment_before_insert
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_amount();

-- Add verified columns to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
