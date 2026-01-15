-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create shop_settings table for storing all configurable settings
CREATE TABLE public.shop_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Shop Details
  shop_name text NOT NULL DEFAULT 'FoodShop Restaurant',
  phone text,
  address text,
  gst_number text,
  fssai_license text,
  
  -- Billing & Tax
  gst_rate numeric NOT NULL DEFAULT 5,
  auto_generate_invoice boolean NOT NULL DEFAULT true,
  include_gst_in_price boolean NOT NULL DEFAULT false,
  
  -- Notifications
  low_stock_alerts boolean NOT NULL DEFAULT true,
  new_order_sound boolean NOT NULL DEFAULT true,
  daily_summary_email boolean NOT NULL DEFAULT false,
  
  -- Printer Configuration
  receipt_printer text DEFAULT 'EPSON TM-T88V',
  kitchen_printer text,
  
  -- Data & Security
  auto_backup boolean NOT NULL DEFAULT true,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view settings
CREATE POLICY "Authenticated users can view settings"
ON public.shop_settings
FOR SELECT
TO authenticated
USING (true);

-- Only developer and central_admin can update settings
CREATE POLICY "Admins can update settings"
ON public.shop_settings
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'developer') OR 
  public.has_role(auth.uid(), 'central_admin')
);

-- Only developer can insert settings (for initial setup)
CREATE POLICY "Developer can insert settings"
ON public.shop_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'developer'));

-- Create trigger for updated_at
CREATE TRIGGER update_shop_settings_updated_at
BEFORE UPDATE ON public.shop_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.shop_settings (shop_name) VALUES ('FoodShop Restaurant');