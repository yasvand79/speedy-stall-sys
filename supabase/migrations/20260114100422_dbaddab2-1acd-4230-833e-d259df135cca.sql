-- Create invite_codes table
CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  role_assigned app_role NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  expires_at timestamp with time zone,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create approval_logs table
CREATE TABLE public.approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('APPROVED', 'REJECTED')),
  admin_id uuid NOT NULL,
  remarks text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invite_code_used text,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Update status column to ensure it uses correct values
-- First update existing statuses
UPDATE public.profiles SET status = 'pending' WHERE status IS NULL OR status NOT IN ('pending', 'approved', 'rejected');

-- Enable RLS on new tables
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invite_codes
CREATE POLICY "Developer can manage all invite codes"
ON public.invite_codes FOR ALL
USING (has_role(auth.uid(), 'developer'::app_role));

CREATE POLICY "Central admin can manage invite codes"
ON public.invite_codes FOR ALL
USING (has_role(auth.uid(), 'central_admin'::app_role));

CREATE POLICY "Anyone can validate invite codes during signup"
ON public.invite_codes FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()) AND used_count < max_uses);

-- RLS Policies for approval_logs
CREATE POLICY "Developer can view all approval logs"
ON public.approval_logs FOR SELECT
USING (has_role(auth.uid(), 'developer'::app_role));

CREATE POLICY "Central admin can view all approval logs"
ON public.approval_logs FOR SELECT
USING (has_role(auth.uid(), 'central_admin'::app_role));

CREATE POLICY "Branch admin can view own branch approval logs"
ON public.approval_logs FOR SELECT
USING (
  has_role(auth.uid(), 'branch_admin'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = approval_logs.user_id
    AND p.branch_id = get_user_branch(auth.uid())
  )
);

CREATE POLICY "Admins can insert approval logs"
ON public.approval_logs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'developer'::app_role) OR has_role(auth.uid(), 'central_admin'::app_role));

-- Function to validate and use invite code
CREATE OR REPLACE FUNCTION public.validate_invite_code(invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record invite_codes%ROWTYPE;
BEGIN
  SELECT * INTO code_record
  FROM invite_codes
  WHERE code = invite_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND used_count < max_uses;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired invite code');
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'role', code_record.role_assigned,
    'branch_id', code_record.branch_id
  );
END;
$$;

-- Function to use invite code (increment counter)
CREATE OR REPLACE FUNCTION public.use_invite_code(invite_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE invite_codes
  SET used_count = used_count + 1
  WHERE code = invite_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND used_count < max_uses;
  
  RETURN FOUND;
END;
$$;

-- Update handle_new_user to set status as pending and use invite code from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role app_role;
  selected_branch_id uuid;
  invite_code_val text;
  is_developer boolean;
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
  
  -- Check if this is a developer role (auto-approved)
  is_developer := selected_role = 'developer'::app_role;

  -- Insert profile with pending status (or approved for developer)
  INSERT INTO public.profiles (user_id, full_name, branch_id, invite_code_used, status, approved_at)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    selected_branch_id,
    invite_code_val,
    CASE WHEN is_developer THEN 'approved' ELSE 'pending' END,
    CASE WHEN is_developer THEN now() ELSE NULL END
  );

  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, selected_role);
  
  -- Use the invite code
  IF invite_code_val IS NOT NULL THEN
    PERFORM use_invite_code(invite_code_val);
  END IF;

  RETURN new;
END;
$$;

-- Function to approve a user
CREATE OR REPLACE FUNCTION public.approve_user(target_user_id uuid, remarks_text text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller has permission
  IF NOT (has_role(auth.uid(), 'developer'::app_role) OR has_role(auth.uid(), 'central_admin'::app_role)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  -- Update profile status
  UPDATE profiles
  SET status = 'approved',
      approved_at = now(),
      approved_by = auth.uid()
  WHERE user_id = target_user_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Log the approval
  INSERT INTO approval_logs (user_id, action, admin_id, remarks)
  VALUES (target_user_id, 'APPROVED', auth.uid(), remarks_text);
  
  RETURN true;
END;
$$;

-- Function to reject a user
CREATE OR REPLACE FUNCTION public.reject_user(target_user_id uuid, remarks_text text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller has permission
  IF NOT (has_role(auth.uid(), 'developer'::app_role) OR has_role(auth.uid(), 'central_admin'::app_role)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  -- Update profile status
  UPDATE profiles
  SET status = 'rejected'
  WHERE user_id = target_user_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Log the rejection
  INSERT INTO approval_logs (user_id, action, admin_id, remarks)
  VALUES (target_user_id, 'REJECTED', auth.uid(), remarks_text);
  
  RETURN true;
END;
$$;

-- Function to generate a random invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;