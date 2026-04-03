-- Add SELECT policy for developer role
CREATE POLICY "Developer can view all payments" ON public.payments
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'developer'::app_role));

-- Add SELECT policy for central_admin role
CREATE POLICY "Central admin can view all payments" ON public.payments
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'central_admin'::app_role));