-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can view inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Anyone authenticated can view menu" ON public.menu_items;
DROP POLICY IF EXISTS "Authenticated users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Developers can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Developers can manage all profiles" ON public.profiles;

-- Create all policies with new role structure

-- user_roles policies
CREATE POLICY "Developers can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'developer'));

CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- profiles policies  
CREATE POLICY "Developers can manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'developer'));

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- menu_items policies
CREATE POLICY "Authenticated can view menu" ON public.menu_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Developers and admins can manage menu" ON public.menu_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'admin'));

-- orders policies
CREATE POLICY "Authenticated can view orders" ON public.orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can create orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'billing'));

CREATE POLICY "Staff can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'billing'));

-- order_items policies
CREATE POLICY "Authenticated can view order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can manage order items" ON public.order_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'billing'));

-- payments policies
CREATE POLICY "Developers and admins can view all payments" ON public.payments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Billing can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'billing') AND created_by = auth.uid());

CREATE POLICY "Staff can create payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'billing'));

-- inventory policies (developers only)
CREATE POLICY "Developers only for inventory" ON public.inventory
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'developer'));

CREATE POLICY "Developers only for inventory logs" ON public.inventory_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'developer'));