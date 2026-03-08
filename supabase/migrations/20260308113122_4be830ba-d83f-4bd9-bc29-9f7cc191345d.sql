
-- Fix 1: Invite codes should not be publicly enumerable
-- Drop the permissive anon policy and create a server-side validation function
DROP POLICY IF EXISTS "Anyone can validate invite codes during signup" ON public.invite_codes;

-- Allow only authenticated users to validate a specific code (not enumerate all)
-- The validate_invite_code function already exists as SECURITY DEFINER, so anon SELECT is not needed

-- Fix 2: Restrict customer PII to appropriate roles
DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;

CREATE POLICY "Staff can view customers by role"
  ON public.customers FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'branch_admin'::app_role) OR 
    has_role(auth.uid(), 'billing'::app_role)
  );

-- Fix 3: Restrict invoices to branch-scoped access
DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;

CREATE POLICY "Staff can view invoices by branch"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = invoices.order_id 
      AND (
        has_role(auth.uid(), 'admin'::app_role) OR
        (o.branch_id IS NOT NULL AND has_branch_access(auth.uid(), o.branch_id)) OR
        (o.branch_id IS NULL AND o.created_by = auth.uid())
      )
    )
  );

-- Fix 4: Restrict order_items to branch-scoped access
DROP POLICY IF EXISTS "Authenticated can view order items" ON public.order_items;

CREATE POLICY "Staff can view order items by branch"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_items.order_id 
      AND (
        (o.branch_id IS NOT NULL AND has_branch_access(auth.uid(), o.branch_id)) OR
        (o.branch_id IS NULL AND o.created_by = auth.uid())
      )
    )
  );
