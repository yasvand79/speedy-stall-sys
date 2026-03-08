
-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can check invitations by email" ON public.staff_invitations;

CREATE POLICY "Anyone can check invitations by email"
ON public.staff_invitations
FOR SELECT
TO anon, authenticated
USING (status = 'pending');
