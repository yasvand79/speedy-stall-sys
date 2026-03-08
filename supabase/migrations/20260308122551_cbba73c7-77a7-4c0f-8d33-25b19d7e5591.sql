
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS bill_header_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bill_footer_text text DEFAULT 'Thank You! Visit us again',
  ADD COLUMN IF NOT EXISTS bill_terms text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bill_show_gstin boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS bill_show_fssai boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS bill_show_upi boolean DEFAULT true;
