-- First drop any policies that depend on has_role (if any exist)
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Developers can manage all roles" ON public.user_roles;

-- Drop the has_role function (will CASCADE to dependent policies)
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role CASCADE;

-- Change user_roles.role column to text temporarily
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;

-- Now drop the old enum
DROP TYPE IF EXISTS public.app_role;

-- Create new enum
CREATE TYPE public.app_role AS ENUM ('developer', 'admin', 'billing');

-- Update any 'cashier' or 'kitchen' values to 'billing'
UPDATE public.user_roles SET role = 'billing' WHERE role IN ('cashier', 'kitchen');

-- Convert back to enum
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::public.app_role;
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'billing'::public.app_role;

-- Recreate has_role function with new enum type
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Recreate get_user_role function
CREATE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'billing');
  
  RETURN NEW;
END;
$$;