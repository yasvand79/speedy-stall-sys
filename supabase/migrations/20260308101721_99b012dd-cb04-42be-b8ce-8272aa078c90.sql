
-- Create staff_invitations table
CREATE TABLE public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role_assigned app_role NOT NULL DEFAULT 'billing',
  branch_id uuid REFERENCES public.branches(id),
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_at timestamp with time zone,
  UNIQUE(email, status)
);

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view invitations"
  ON public.staff_invitations FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'developer'::app_role) OR
    has_role(auth.uid(), 'central_admin'::app_role)
  );

CREATE POLICY "Admins can create invitations"
  ON public.staff_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'developer'::app_role) OR
    has_role(auth.uid(), 'central_admin'::app_role)
  );

CREATE POLICY "Admins can update invitations"
  ON public.staff_invitations FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'developer'::app_role) OR
    has_role(auth.uid(), 'central_admin'::app_role)
  );

CREATE POLICY "Admins can delete invitations"
  ON public.staff_invitations FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'developer'::app_role) OR
    has_role(auth.uid(), 'central_admin'::app_role)
  );

-- Allow anyone to check their email during signup (anon access for validation)
CREATE POLICY "Anyone can check invitations by email"
  ON public.staff_invitations FOR SELECT
  TO anon, authenticated
  USING (status = 'pending');

-- Update handle_new_user to check staff_invitations instead of invite_codes
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
  -- Check if there's a pending invitation for this email
  SELECT * INTO invitation_record
  FROM staff_invitations
  WHERE email = LOWER(new.email)
    AND status = 'pending'
  LIMIT 1;

  IF FOUND THEN
    -- Use role and branch from invitation
    selected_role := invitation_record.role_assigned;
    selected_branch_id := invitation_record.branch_id;
    is_auto_approved := true;
    
    -- Mark invitation as used
    UPDATE staff_invitations
    SET status = 'used', used_at = now()
    WHERE id = invitation_record.id;
  ELSE
    -- No invitation found - register as billing with pending status
    selected_role := 'billing';
    selected_branch_id := NULL;
    is_auto_approved := false;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name, branch_id, status, approved_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    selected_branch_id,
    CASE WHEN is_auto_approved THEN 'approved' ELSE 'pending' END,
    CASE WHEN is_auto_approved THEN now() ELSE NULL END
  );

  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, selected_role);

  RETURN new;
END;
$function$;
