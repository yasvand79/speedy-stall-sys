
-- Drop existing foreign key constraint on order_items
ALTER TABLE public.order_items
  DROP CONSTRAINT order_items_menu_item_id_fkey;

-- Re-add with SET NULL so deleting a menu item doesn't fail
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_menu_item_id_fkey
  FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;

-- Make menu_item_id nullable to support SET NULL
ALTER TABLE public.order_items
  ALTER COLUMN menu_item_id DROP NOT NULL;

-- Also handle branch_menu_prices - cascade delete
ALTER TABLE public.branch_menu_prices
  DROP CONSTRAINT branch_menu_prices_menu_item_id_fkey;

ALTER TABLE public.branch_menu_prices
  ADD CONSTRAINT branch_menu_prices_menu_item_id_fkey
  FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;
