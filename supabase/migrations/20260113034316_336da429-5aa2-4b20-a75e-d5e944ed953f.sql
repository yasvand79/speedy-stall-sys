-- Fix PUBLIC_DATA_EXPOSURE: Orders with NULL branch_id should only be visible to creator or admin roles
-- Drop existing policy and create a more restrictive one

DROP POLICY IF EXISTS "Users can view orders based on role and branch" ON public.orders;

CREATE POLICY "Users can view orders based on role and branch" 
ON public.orders FOR SELECT 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role) OR
  (branch_id IS NOT NULL AND has_branch_access(auth.uid(), branch_id)) OR
  (branch_id IS NULL AND created_by = auth.uid())
);