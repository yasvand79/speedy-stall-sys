-- Update handle_new_user function to include branch_id from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  selected_role app_role;
  selected_branch_id uuid;
BEGIN
  -- Get role from user metadata, default to 'billing' if not provided
  selected_role := COALESCE(
    (new.raw_user_meta_data ->> 'role')::app_role,
    'billing'::app_role
  );

  -- Get branch_id from user metadata (can be null for central admin/developer)
  selected_branch_id := NULLIF(new.raw_user_meta_data ->> 'branch_id', '')::uuid;

  -- Insert profile with branch_id
  INSERT INTO public.profiles (user_id, full_name, branch_id)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    selected_branch_id
  );

  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, selected_role);

  RETURN new;
END;
$$;