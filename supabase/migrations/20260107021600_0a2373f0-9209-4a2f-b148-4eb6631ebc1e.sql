-- Create enum types for the system
CREATE TYPE public.app_role AS ENUM ('admin', 'cashier', 'kitchen');
CREATE TYPE public.order_type AS ENUM ('dine-in', 'takeaway');
CREATE TYPE public.order_status AS ENUM ('placed', 'preparing', 'ready', 'completed', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'upi', 'card');
CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'completed');
CREATE TYPE public.menu_category AS ENUM ('veg', 'non-veg', 'beverages', 'combos');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'cashier',
  UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category menu_category NOT NULL,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  preparation_time INTEGER DEFAULT 10,
  ingredients TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create inventory table
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_quantity DECIMAL(10,2) NOT NULL DEFAULT 5,
  cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  last_restocked TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  type order_type NOT NULL DEFAULT 'dine-in',
  status order_status NOT NULL DEFAULT 'placed',
  table_number INTEGER,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  gst DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method payment_method NOT NULL,
  transaction_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create inventory_logs table for tracking changes
CREATE TABLE public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  quantity_change DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- Create has_role function for RLS (Security Definer to prevent recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for menu_items
CREATE POLICY "Anyone authenticated can view menu" ON public.menu_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage menu" ON public.menu_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for inventory
CREATE POLICY "Authenticated users can view inventory" ON public.inventory
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage inventory" ON public.inventory
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders (all staff can view/manage orders)
CREATE POLICY "Authenticated users can view orders" ON public.orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Cashiers and admins can create orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'cashier')
  );

CREATE POLICY "All staff can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (true);

-- RLS Policies for order_items
CREATE POLICY "Authenticated users can view order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Cashiers and admins can manage order items" ON public.order_items
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'cashier')
  );

-- RLS Policies for payments
CREATE POLICY "Authenticated users can view payments" ON public.payments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Cashiers and admins can create payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'cashier')
  );

-- RLS Policies for inventory_logs
CREATE POLICY "Authenticated users can view inventory logs" ON public.inventory_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can create inventory logs" ON public.inventory_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_menu_items BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_inventory BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup (creates profile and assigns default role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cashier');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  today_prefix TEXT;
  sequence_num INTEGER;
BEGIN
  today_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 10) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.orders
  WHERE order_number LIKE today_prefix || '-%';
  
  new_number := today_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Create trigger to auto-generate order number
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- Insert sample menu items
INSERT INTO public.menu_items (name, description, price, category, preparation_time, ingredients) VALUES
('Butter Chicken', 'Creamy tomato-based curry with tender chicken', 320.00, 'non-veg', 20, ARRAY['Chicken', 'Tomato', 'Cream', 'Butter', 'Spices']),
('Paneer Tikka', 'Grilled cottage cheese with spices', 240.00, 'veg', 15, ARRAY['Paneer', 'Yogurt', 'Bell Peppers', 'Onions', 'Spices']),
('Veg Biryani', 'Fragrant rice with mixed vegetables', 200.00, 'veg', 25, ARRAY['Rice', 'Mixed Vegetables', 'Saffron', 'Spices']),
('Chicken Biryani', 'Aromatic rice with spiced chicken', 280.00, 'non-veg', 30, ARRAY['Rice', 'Chicken', 'Saffron', 'Spices']),
('Masala Dosa', 'Crispy crepe with potato filling', 120.00, 'veg', 10, ARRAY['Rice Batter', 'Potatoes', 'Onions', 'Mustard Seeds']),
('Fresh Lime Soda', 'Refreshing lime drink', 60.00, 'beverages', 5, ARRAY['Lime', 'Soda', 'Sugar', 'Salt']),
('Mango Lassi', 'Sweet mango yogurt drink', 80.00, 'beverages', 5, ARRAY['Mango', 'Yogurt', 'Sugar', 'Cardamom']),
('Family Combo', '2 Biryanis + 2 Drinks + 1 Dessert', 599.00, 'combos', 35, ARRAY['Rice', 'Chicken', 'Paneer', 'Drinks', 'Gulab Jamun']),
('Dal Makhani', 'Slow-cooked black lentils in creamy gravy', 180.00, 'veg', 15, ARRAY['Black Lentils', 'Cream', 'Butter', 'Tomatoes']),
('Tandoori Chicken', 'Clay oven roasted spiced chicken', 350.00, 'non-veg', 25, ARRAY['Chicken', 'Yogurt', 'Tandoori Spices']);

-- Insert sample inventory items
INSERT INTO public.inventory (name, unit, quantity, min_quantity, cost_per_unit) VALUES
('Chicken', 'kg', 25.00, 5.00, 250.00),
('Paneer', 'kg', 15.00, 3.00, 320.00),
('Rice', 'kg', 50.00, 10.00, 80.00),
('Tomatoes', 'kg', 20.00, 5.00, 40.00),
('Onions', 'kg', 30.00, 8.00, 35.00),
('Cream', 'ltr', 10.00, 2.00, 180.00),
('Yogurt', 'ltr', 15.00, 3.00, 60.00),
('Cooking Oil', 'ltr', 20.00, 5.00, 150.00),
('Spices Mix', 'kg', 5.00, 1.00, 800.00),
('Butter', 'kg', 8.00, 2.00, 450.00);