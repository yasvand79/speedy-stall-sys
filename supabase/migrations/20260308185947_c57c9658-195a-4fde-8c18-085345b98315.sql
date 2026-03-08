
-- Create triggers to auto-log changes to key tables into audit_logs

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (action, table_name, record_id, new_value, user_id)
    VALUES (TG_OP, TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (action, table_name, record_id, old_value, new_value, user_id)
    VALUES (TG_OP, TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (action, table_name, record_id, old_value, user_id)
    VALUES (TG_OP, TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger on staff_invitations (staff added)
CREATE TRIGGER audit_staff_invitations
AFTER INSERT OR UPDATE OR DELETE ON public.staff_invitations
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Trigger on menu_items (menu changes)
CREATE TRIGGER audit_menu_items
AFTER INSERT OR UPDATE OR DELETE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Trigger on branches (branch add/edit/remove)
CREATE TRIGGER audit_branches
AFTER INSERT OR UPDATE OR DELETE ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Trigger on user_roles (role changes)
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Trigger on profiles (staff status changes)
CREATE TRIGGER audit_profiles
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Trigger on payments (payment recorded)
CREATE TRIGGER audit_payments
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Trigger on orders (order status changes)
CREATE TRIGGER audit_orders
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Trigger on shop_settings (settings changes)
CREATE TRIGGER audit_shop_settings
AFTER UPDATE ON public.shop_settings
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
