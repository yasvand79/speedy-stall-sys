-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Staff can create payments" ON public.payments;

-- Recreate with all admin-like roles included
CREATE POLICY "Staff can create payments" ON public.payments
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'central_admin'::app_role) OR
  has_role(auth.uid(), 'developer'::app_role) OR
  has_role(auth.uid(), 'branch_admin'::app_role) OR
  has_role(auth.uid(), 'billing'::app_role)
);