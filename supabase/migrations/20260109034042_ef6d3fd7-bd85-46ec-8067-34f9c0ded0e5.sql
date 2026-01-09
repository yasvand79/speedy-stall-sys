-- Update the handle_new_user function to use the role from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  selected_role app_role;
BEGIN
  -- Get role from user metadata, default to 'billing' if not provided
  selected_role := COALESCE(
    (new.raw_user_meta_data ->> 'role')::app_role,
    'billing'::app_role
  );

  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'full_name', ''));

  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, selected_role);

  RETURN new;
END;
$$;