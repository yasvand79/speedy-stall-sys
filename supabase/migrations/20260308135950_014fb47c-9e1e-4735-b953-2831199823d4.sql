
-- Drop existing admin-only manage policy and replace with one that also allows branch_admin to update availability
DROP POLICY IF EXISTS "Admins can manage menu" ON public.menu_items;

-- Admin full access
CREATE POLICY "Admins can manage menu"
ON public.menu_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Branch admins can update availability
CREATE POLICY "Branch admins can update menu availability"
ON public.menu_items FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'branch_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'branch_admin'::app_role));
