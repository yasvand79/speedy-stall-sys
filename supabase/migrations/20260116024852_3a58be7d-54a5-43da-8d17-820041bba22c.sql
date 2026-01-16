-- Add UPI ID to shop_settings
ALTER TABLE public.shop_settings 
ADD COLUMN IF NOT EXISTS upi_id text DEFAULT NULL;