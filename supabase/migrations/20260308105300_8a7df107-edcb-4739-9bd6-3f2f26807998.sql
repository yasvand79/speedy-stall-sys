
-- Drop existing restrictive policies on staff_invitations
DROP POLICY IF EXISTS "Admins can create invitations" ON public.staff_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.staff_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.staff_invitations;
DROP POLICY IF EXISTS "Admins can view invitations" ON public.staff_invitations;

-- Recreate policies to include branch_admin
CREATE POLICY "Admins and branch admins can create invitations"
ON public.staff_invitations FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_admin'::app_role)
);

CREATE POLICY "Admins and branch admins can view invitations"
ON public.staff_invitations FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'branch_admin'::app_role) AND invited_by = auth.uid())
);

CREATE POLICY "Admins and branch admins can delete invitations"
ON public.staff_invitations FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'branch_admin'::app_role) AND invited_by = auth.uid())
);

CREATE POLICY "Admins and branch admins can update invitations"
ON public.staff_invitations FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'branch_admin'::app_role) AND invited_by = auth.uid())
);
