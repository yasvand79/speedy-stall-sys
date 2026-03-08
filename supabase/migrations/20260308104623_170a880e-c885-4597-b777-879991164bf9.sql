
-- Migrate existing developer and central_admin users to admin
UPDATE public.user_roles SET role = 'admin' WHERE role IN ('developer', 'central_admin');
UPDATE public.staff_invitations SET role_assigned = 'admin' WHERE role_assigned IN ('developer', 'central_admin');
UPDATE public.invite_codes SET role_assigned = 'admin' WHERE role_assigned IN ('developer', 'central_admin');

-- Update handle_new_user function
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

  INSERT INTO public.profiles (user_id, full_name, branch_id, status, approved_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    selected_branch_id,
    CASE WHEN is_auto_approved THEN 'approved' ELSE 'pending' END,
    CASE WHEN is_auto_approved THEN now() ELSE NULL END
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, selected_role);

  RETURN new;
END;
$function$;

-- Update approve_user function
CREATE OR REPLACE FUNCTION public.approve_user(target_user_id uuid, remarks_text text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  UPDATE profiles
  SET status = 'approved', approved_at = now(), approved_by = auth.uid()
  WHERE user_id = target_user_id AND status = 'pending';
  
  IF NOT FOUND THEN RETURN false; END IF;
  
  INSERT INTO approval_logs (user_id, action, admin_id, remarks)
  VALUES (target_user_id, 'APPROVED', auth.uid(), remarks_text);
  
  RETURN true;
END;
$function$;

-- Update reject_user function
CREATE OR REPLACE FUNCTION public.reject_user(target_user_id uuid, remarks_text text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  UPDATE profiles
  SET status = 'rejected'
  WHERE user_id = target_user_id AND status = 'pending';
  
  IF NOT FOUND THEN RETURN false; END IF;
  
  INSERT INTO approval_logs (user_id, action, admin_id, remarks)
  VALUES (target_user_id, 'REJECTED', auth.uid(), remarks_text);
  
  RETURN true;
END;
$function$;

-- Update has_branch_access function
CREATE OR REPLACE FUNCTION public.has_branch_access(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (
    has_role(_user_id, 'admin'::app_role) OR
    (SELECT branch_id FROM public.profiles WHERE user_id = _user_id) = _branch_id
  )
$function$;

-- ====== UPDATE ALL RLS POLICIES ======

-- profiles
DROP POLICY IF EXISTS "Developers can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view profiles based on role" ON public.profiles;
CREATE POLICY "Users can view profiles based on role" ON public.profiles FOR SELECT
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Developers can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;
CREATE POLICY "Users can view roles" ON public.user_roles FOR SELECT
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_admin'::app_role));

-- staff_invitations
DROP POLICY IF EXISTS "Admins can view invitations" ON public.staff_invitations;
CREATE POLICY "Admins can view invitations" ON public.staff_invitations FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can create invitations" ON public.staff_invitations;
CREATE POLICY "Admins can create invitations" ON public.staff_invitations FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update invitations" ON public.staff_invitations;
CREATE POLICY "Admins can update invitations" ON public.staff_invitations FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete invitations" ON public.staff_invitations;
CREATE POLICY "Admins can delete invitations" ON public.staff_invitations FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- branches
DROP POLICY IF EXISTS "Only developers can manage branches" ON public.branches;
CREATE POLICY "Admins can manage branches" ON public.branches FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Everyone can view active branches" ON public.branches;
CREATE POLICY "Everyone can view active branches" ON public.branches FOR SELECT USING ((is_active = true) OR has_role(auth.uid(), 'admin'::app_role));

-- shop_settings
DROP POLICY IF EXISTS "Admins can update settings" ON public.shop_settings;
CREATE POLICY "Admins can update settings" ON public.shop_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Developer can insert settings" ON public.shop_settings;
CREATE POLICY "Admin can insert settings" ON public.shop_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- orders
DROP POLICY IF EXISTS "Users can view orders based on role and branch" ON public.orders;
CREATE POLICY "Users can view orders based on role and branch" ON public.orders FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR ((branch_id IS NOT NULL) AND has_branch_access(auth.uid(), branch_id)) OR ((branch_id IS NULL) AND (created_by = auth.uid())));

DROP POLICY IF EXISTS "Staff can create orders" ON public.orders;
CREATE POLICY "Staff can create orders" ON public.orders FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role));

DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role));

-- payments
DROP POLICY IF EXISTS "Developer and central admin can view all payments" ON public.payments;
CREATE POLICY "Admin can view all payments" ON public.payments FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Staff can create payments" ON public.payments;
CREATE POLICY "Staff can create payments" ON public.payments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role));

-- order_items
DROP POLICY IF EXISTS "Staff can manage order items" ON public.order_items;
CREATE POLICY "Staff can manage order items" ON public.order_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role));

-- menu_items
DROP POLICY IF EXISTS "Developers and central admins can manage menu" ON public.menu_items;
CREATE POLICY "Admins can manage menu" ON public.menu_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- branch_menu_prices
DROP POLICY IF EXISTS "Developer and Central Admin can manage prices" ON public.branch_menu_prices;
CREATE POLICY "Admin can manage prices" ON public.branch_menu_prices FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- inventory
DROP POLICY IF EXISTS "Developers only for inventory" ON public.inventory;
CREATE POLICY "Admin can manage inventory" ON public.inventory FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- inventory_logs
DROP POLICY IF EXISTS "Developers only for inventory logs" ON public.inventory_logs;
CREATE POLICY "Admin can manage inventory logs" ON public.inventory_logs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- audit_logs
DROP POLICY IF EXISTS "Developer can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Central admin can view audit logs" ON public.audit_logs;
CREATE POLICY "Admin can view audit logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- approval_logs
DROP POLICY IF EXISTS "Developer can view all approval logs" ON public.approval_logs;
DROP POLICY IF EXISTS "Central admin can view all approval logs" ON public.approval_logs;
CREATE POLICY "Admin can view approval logs" ON public.approval_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert approval logs" ON public.approval_logs;
CREATE POLICY "Admin can insert approval logs" ON public.approval_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- refunds
DROP POLICY IF EXISTS "Staff can view refunds" ON public.refunds;
CREATE POLICY "Staff can view refunds" ON public.refunds FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_admin'::app_role) OR (requested_by = auth.uid()));

DROP POLICY IF EXISTS "Staff can request refunds" ON public.refunds;
CREATE POLICY "Staff can request refunds" ON public.refunds FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role));

DROP POLICY IF EXISTS "Admins can update refunds" ON public.refunds;
CREATE POLICY "Admin can update refunds" ON public.refunds FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- staff_performance
DROP POLICY IF EXISTS "Central Admin and Developer can view all performance" ON public.staff_performance;
CREATE POLICY "Admin can view all performance" ON public.staff_performance FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "System can manage performance records" ON public.staff_performance;
CREATE POLICY "Admin can manage performance records" ON public.staff_performance FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- report_email_logs
DROP POLICY IF EXISTS "Developer and Central Admin can view logs" ON public.report_email_logs;
CREATE POLICY "Admin can view logs" ON public.report_email_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- report_schedules
DROP POLICY IF EXISTS "Central Admin can view schedules" ON public.report_schedules;
DROP POLICY IF EXISTS "Developer can manage schedules" ON public.report_schedules;
CREATE POLICY "Admin can manage schedules" ON public.report_schedules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- invite_codes
DROP POLICY IF EXISTS "Developer can manage all invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Central admin can manage invite codes" ON public.invite_codes;
CREATE POLICY "Admin can manage invite codes" ON public.invite_codes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- customers
DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
CREATE POLICY "Staff can manage customers" ON public.customers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role));

-- invoices
DROP POLICY IF EXISTS "Staff can create invoices" ON public.invoices;
CREATE POLICY "Staff can create invoices" ON public.invoices FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_admin'::app_role) OR has_role(auth.uid(), 'billing'::app_role));
