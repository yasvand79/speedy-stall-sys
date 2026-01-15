-- Update handle_new_user to auto-approve users with invite codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  selected_role app_role;
  selected_branch_id uuid;
  invite_code_val text;
  is_auto_approved boolean;
  code_valid boolean;
BEGIN
  -- Get role from user metadata, default to 'billing' if not provided
  selected_role := COALESCE(
    (new.raw_user_meta_data ->> 'role')::app_role,
    'billing'::app_role
  );

  -- Get branch_id from user metadata (can be null for central admin/developer)
  selected_branch_id := NULLIF(new.raw_user_meta_data ->> 'branch_id', '')::uuid;
  
  -- Get invite code from metadata
  invite_code_val := new.raw_user_meta_data ->> 'invite_code';
  
  -- Determine if auto-approved:
  -- 1. Developer role is always auto-approved
  -- 2. Users with valid invite codes are auto-approved
  is_auto_approved := selected_role = 'developer'::app_role;
  
  -- Check if invite code is valid and auto-approve
  IF invite_code_val IS NOT NULL AND invite_code_val != '' THEN
    SELECT EXISTS (
      SELECT 1 FROM invite_codes
      WHERE code = invite_code_val
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
        AND used_count < max_uses
    ) INTO code_valid;
    
    IF code_valid THEN
      is_auto_approved := true;
    END IF;
  END IF;

  -- Insert profile with appropriate status
  INSERT INTO public.profiles (user_id, full_name, branch_id, invite_code_used, status, approved_at)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    selected_branch_id,
    invite_code_val,
    CASE WHEN is_auto_approved THEN 'approved' ELSE 'pending' END,
    CASE WHEN is_auto_approved THEN now() ELSE NULL END
  );

  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, selected_role);
  
  -- Use the invite code (increment used_count)
  IF invite_code_val IS NOT NULL AND invite_code_val != '' THEN
    PERFORM use_invite_code(invite_code_val);
  END IF;

  RETURN new;
END;
$$;