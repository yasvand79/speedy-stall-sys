-- Remove 'admin' from app_role enum - Comprehensive migration
-- Must drop all dependent objects first, then recreate them

-- Step 1: Drop all dependent policies
DROP POLICY IF EXISTS "Developers can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Developers can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Developers and admins can manage menu" ON public.menu_items;
DROP POLICY IF EXISTS "Developers and central admins can manage menu" ON public.menu_items;
DROP POLICY IF EXISTS "Staff can create orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Developers and admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Developer and central admin can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Billing can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Developers only for inventory" ON public.inventory;
DROP POLICY IF EXISTS "Developers only for inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Staff can create payments" ON public.payments;
DROP POLICY IF EXISTS "Everyone can view active branches" ON public.branches;
DROP POLICY IF EXISTS "Only developers can manage branches" ON public.branches;
DROP POLICY IF EXISTS "Developer and Central Admin can manage prices" ON public.branch_menu_prices;
DROP POLICY IF EXISTS "Central Admin and Developer can view all performance" ON public.staff_performance;
DROP POLICY IF EXISTS "System can manage performance records" ON public.staff_performance;
DROP POLICY IF EXISTS "Developer can manage schedules" ON public.report_schedules;
DROP POLICY IF EXISTS "Central Admin can view schedules" ON public.report_schedules;
DROP POLICY IF EXISTS "Developer and Central Admin can view logs" ON public.report_email_logs;
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view profiles based on role" ON public.profiles;
DROP POLICY IF EXISTS "Users can view orders based on role and branch" ON public.orders;

-- Step 2: Drop dependent functions
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- Step 3: Drop old app_role_new if it exists from previous failed migration
DROP TYPE IF EXISTS public.app_role_new;

-- Step 4: Drop default on user_roles column
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;

-- Step 5: Create new enum without 'admin'
CREATE TYPE public.app_role_new AS ENUM ('developer', 'central_admin', 'branch_admin', 'billing');

-- Step 6: Update user_roles table to use new enum  
ALTER TABLE public.user_roles 
ALTER COLUMN role TYPE public.app_role_new 
USING role::text::public.app_role_new;

-- Step 7: Restore default
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'billing'::public.app_role_new;

-- Step 8: Drop old enum and rename new one
DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Step 9: Recreate functions with new enum type
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Step 10: Recreate all policies without 'admin' role

-- user_roles policies
CREATE POLICY "Developers can manage all roles" 
ON public.user_roles FOR ALL 
USING (has_role(auth.uid(), 'developer'::app_role));

CREATE POLICY "Users can view roles" 
ON public.user_roles FOR SELECT 
USING (
  (user_id = auth.uid()) OR 
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role) OR 
  has_role(auth.uid(), 'branch_admin'::app_role)
);

-- profiles policies
CREATE POLICY "Developers can manage all profiles" 
ON public.profiles FOR ALL 
USING (has_role(auth.uid(), 'developer'::app_role));

CREATE POLICY "Users can view profiles based on role" 
ON public.profiles FOR SELECT 
USING (
  (user_id = auth.uid()) OR 
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role) OR 
  has_role(auth.uid(), 'branch_admin'::app_role)
);

-- menu_items policies
CREATE POLICY "Developers and central admins can manage menu" 
ON public.menu_items FOR ALL 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role)
);

-- orders policies
CREATE POLICY "Users can view orders based on role and branch" 
ON public.orders FOR SELECT 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role) OR 
  ((branch_id IS NOT NULL) AND has_branch_access(auth.uid(), branch_id)) OR 
  ((branch_id IS NULL) AND (created_by = auth.uid()))
);

CREATE POLICY "Staff can create orders" 
ON public.orders FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role) OR 
  has_role(auth.uid(), 'branch_admin'::app_role) OR 
  has_role(auth.uid(), 'billing'::app_role)
);

CREATE POLICY "Staff can update orders" 
ON public.orders FOR UPDATE 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role) OR 
  has_role(auth.uid(), 'branch_admin'::app_role) OR 
  has_role(auth.uid(), 'billing'::app_role)
);

-- order_items policies
CREATE POLICY "Staff can manage order items" 
ON public.order_items FOR ALL 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role) OR 
  has_role(auth.uid(), 'branch_admin'::app_role) OR 
  has_role(auth.uid(), 'billing'::app_role)
);

-- payments policies
CREATE POLICY "Developer and central admin can view all payments" 
ON public.payments FOR SELECT 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role)
);

CREATE POLICY "Billing can view own payments" 
ON public.payments FOR SELECT 
USING (
  has_role(auth.uid(), 'billing'::app_role) AND 
  (created_by = auth.uid())
);

CREATE POLICY "Staff can create payments" 
ON public.payments FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role) OR 
  has_role(auth.uid(), 'branch_admin'::app_role) OR 
  has_role(auth.uid(), 'billing'::app_role)
);

-- inventory policies
CREATE POLICY "Developers only for inventory" 
ON public.inventory FOR ALL 
USING (has_role(auth.uid(), 'developer'::app_role));

-- inventory_logs policies
CREATE POLICY "Developers only for inventory logs" 
ON public.inventory_logs FOR ALL 
USING (has_role(auth.uid(), 'developer'::app_role));

-- branches policies
CREATE POLICY "Everyone can view active branches" 
ON public.branches FOR SELECT 
USING ((is_active = true) OR has_role(auth.uid(), 'developer'::app_role));

CREATE POLICY "Only developers can manage branches" 
ON public.branches FOR ALL 
USING (has_role(auth.uid(), 'developer'::app_role));

-- branch_menu_prices policies
CREATE POLICY "Developer and Central Admin can manage prices" 
ON public.branch_menu_prices FOR ALL 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role)
);

-- staff_performance policies
CREATE POLICY "Central Admin and Developer can view all performance" 
ON public.staff_performance FOR SELECT 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role)
);

CREATE POLICY "System can manage performance records" 
ON public.staff_performance FOR ALL 
USING (has_role(auth.uid(), 'developer'::app_role));

-- report_schedules policies
CREATE POLICY "Developer can manage schedules" 
ON public.report_schedules FOR ALL 
USING (has_role(auth.uid(), 'developer'::app_role));

CREATE POLICY "Central Admin can view schedules" 
ON public.report_schedules FOR SELECT 
USING (has_role(auth.uid(), 'central_admin'::app_role));

-- report_email_logs policies
CREATE POLICY "Developer and Central Admin can view logs" 
ON public.report_email_logs FOR SELECT 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role)
);