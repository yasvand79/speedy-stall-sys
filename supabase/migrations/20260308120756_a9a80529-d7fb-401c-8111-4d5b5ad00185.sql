
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  selected_role app_role;
  selected_branch_id uuid;
  is_auto_approved boolean;
  invitation_record staff_invitations%ROWTYPE;
BEGIN
  SELECT * INTO invitation_record
  FROM staff_invitations
  WHERE email = LOWER(new.email)
    AND status = 'pending'
  LIMIT 1;

  IF FOUND THEN
    selected_role := invitation_record.role_assigned;
    selected_branch_id := invitation_record.branch_id;
    is_auto_approved := true;
    
    UPDATE staff_invitations
    SET status = 'used', used_at = now()
    WHERE id = invitation_record.id;
  ELSE
    selected_role := 'billing';
    selected_branch_id := NULL;
    is_auto_approved := false;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, phone, branch_id, status, approved_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(COALESCE(new.raw_user_meta_data ->> 'phone', ''), ''),
    selected_branch_id,
    CASE WHEN is_auto_approved THEN 'approved' ELSE 'pending' END,
    CASE WHEN is_auto_approved THEN now() ELSE NULL END
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, selected_role);

  RETURN new;
END;
$function$;
