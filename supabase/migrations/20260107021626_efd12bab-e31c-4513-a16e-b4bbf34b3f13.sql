-- Fix RLS policies with overly permissive USING (true)

-- Drop and recreate order update policy with proper role check
DROP POLICY IF EXISTS "All staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'cashier') OR
    public.has_role(auth.uid(), 'kitchen')
  );

-- Drop and recreate inventory_logs insert policy
DROP POLICY IF EXISTS "System can create inventory logs" ON public.inventory_logs;
CREATE POLICY "Staff can create inventory logs" ON public.inventory_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'cashier') OR
    public.has_role(auth.uid(), 'kitchen')
  );