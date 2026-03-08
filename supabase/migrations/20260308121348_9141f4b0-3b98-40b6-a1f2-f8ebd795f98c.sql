
CREATE OR REPLACE FUNCTION public.get_staff_emails(user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE u.id = ANY(user_ids)
    AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'branch_admin'::app_role)
    )
$$;
