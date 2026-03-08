
-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Staff can create payments" ON public.payments;

-- Create a permissive INSERT policy for staff
CREATE POLICY "Staff can create payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'branch_admin'::app_role) OR
  has_role(auth.uid(), 'billing'::app_role)
);

-- Also fix SELECT policies - drop restrictive ones and recreate as permissive
DROP POLICY IF EXISTS "Admin can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Billing can view own payments" ON public.payments;

CREATE POLICY "Admin can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Branch admin can view branch payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'branch_admin'::app_role) AND
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = payments.order_id
    AND has_branch_access(auth.uid(), o.branch_id)
  )
);

CREATE POLICY "Billing can view own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'billing'::app_role) AND created_by = auth.uid()
);
