
-- Fix 1: Remove anon access to staff_invitations, only allow authenticated users to check their own email
DROP POLICY IF EXISTS "Anyone can check invitations by email" ON public.staff_invitations;

CREATE POLICY "User can check own invitation"
  ON public.staff_invitations FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Fix 2: Replace permissive profile update policy with restricted one (only safe columns)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a secure function to update only safe profile fields
CREATE OR REPLACE FUNCTION public.update_own_profile(_full_name text, _phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET full_name = _full_name, phone = _phone, updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;
