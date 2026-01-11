-- Migration 2: Create tables and policies using the new enum values

-- Fix payments RLS policy
DROP POLICY IF EXISTS "Staff can create payments" ON public.payments;

CREATE POLICY "Staff can create payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'developer'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'billing'::app_role) OR
   has_role(auth.uid(), 'central_admin'::app_role) OR
   has_role(auth.uid(), 'branch_admin'::app_role))
);

-- Create branches table
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Branches RLS policies
CREATE POLICY "Everyone can view active branches" 
ON public.branches 
FOR SELECT 
USING (is_active = true OR has_role(auth.uid(), 'developer'::app_role));

CREATE POLICY "Only developers can manage branches" 
ON public.branches 
FOR ALL 
USING (has_role(auth.uid(), 'developer'::app_role));

-- Create branch_menu_prices table for branch-specific pricing
CREATE TABLE IF NOT EXISTS public.branch_menu_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(branch_id, menu_item_id)
);

-- Enable RLS on branch_menu_prices
ALTER TABLE public.branch_menu_prices ENABLE ROW LEVEL SECURITY;

-- Branch menu prices RLS policies
CREATE POLICY "Staff can view branch prices" 
ON public.branch_menu_prices 
FOR SELECT 
USING (true);

CREATE POLICY "Developer and Central Admin can manage prices" 
ON public.branch_menu_prices 
FOR ALL 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role)
);

-- Add branch_id and status to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add branch_id and staff tracking to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS staff_name TEXT;

-- Create staff_performance tracking table
CREATE TABLE IF NOT EXISTS public.staff_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  average_bill_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS on staff_performance
ALTER TABLE public.staff_performance ENABLE ROW LEVEL SECURITY;

-- Staff performance RLS policies
CREATE POLICY "Staff can view own performance" 
ON public.staff_performance 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Central Admin and Developer can view all performance" 
ON public.staff_performance 
FOR SELECT 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role)
);

CREATE POLICY "System can manage performance records" 
ON public.staff_performance 
FOR ALL 
USING (has_role(auth.uid(), 'developer'::app_role));

-- Create report_schedules table
CREATE TABLE IF NOT EXISTS public.report_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  schedule_time TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  branch_id UUID REFERENCES public.branches(id),
  recipients TEXT[] NOT NULL DEFAULT '{}',
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on report_schedules
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developer can manage schedules" 
ON public.report_schedules 
FOR ALL 
USING (has_role(auth.uid(), 'developer'::app_role));

CREATE POLICY "Central Admin can view schedules" 
ON public.report_schedules 
FOR SELECT 
USING (has_role(auth.uid(), 'central_admin'::app_role));

-- Create report_email_logs table
CREATE TABLE IF NOT EXISTS public.report_email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_schedule_id UUID REFERENCES public.report_schedules(id),
  report_type TEXT NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  recipients TEXT[] NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on report_email_logs
ALTER TABLE public.report_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developer and Central Admin can view logs" 
ON public.report_email_logs 
FOR SELECT 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role)
);

-- Update user_roles policies for new roles
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Users can view roles" 
ON public.user_roles 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role) OR
  has_role(auth.uid(), 'branch_admin'::app_role)
);

-- Update profiles policies for branch-aware access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view profiles based on role" 
ON public.profiles 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role) OR
  has_role(auth.uid(), 'branch_admin'::app_role)
);

-- Create function to get user's branch
CREATE OR REPLACE FUNCTION public.get_user_branch(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT branch_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Create function to check if user has access to branch
CREATE OR REPLACE FUNCTION public.has_branch_access(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    has_role(_user_id, 'developer'::app_role) OR
    has_role(_user_id, 'central_admin'::app_role) OR
    (SELECT branch_id FROM public.profiles WHERE user_id = _user_id) = _branch_id
  )
$$;

-- Update orders RLS for branch-aware access
DROP POLICY IF EXISTS "Authenticated can view orders" ON public.orders;

CREATE POLICY "Users can view orders based on role and branch" 
ON public.orders 
FOR SELECT 
USING (
  has_role(auth.uid(), 'developer'::app_role) OR 
  has_role(auth.uid(), 'central_admin'::app_role) OR
  (branch_id IS NULL) OR
  has_branch_access(auth.uid(), branch_id)
);

-- Insert sample branches
INSERT INTO public.branches (name, location, code, phone, email) VALUES
('Main Branch', '123 Main Street, Downtown', 'MAIN', '+91 9876543210', 'main@foodshop.com'),
('City Center', '456 Central Avenue, City Center', 'CC01', '+91 9876543211', 'citycenter@foodshop.com'),
('Mall Outlet', '789 Shopping Mall, Level 2', 'MALL', '+91 9876543212', 'mall@foodshop.com')
ON CONFLICT (code) DO NOTHING;

-- Create trigger for updated_at on new tables
CREATE OR REPLACE TRIGGER update_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER update_branch_menu_prices_updated_at
BEFORE UPDATE ON public.branch_menu_prices
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER update_staff_performance_updated_at
BEFORE UPDATE ON public.staff_performance
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER update_report_schedules_updated_at
BEFORE UPDATE ON public.report_schedules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();