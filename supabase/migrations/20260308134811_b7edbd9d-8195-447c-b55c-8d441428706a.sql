
-- Create storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload menu images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'menu-images');

-- Allow public read access
CREATE POLICY "Public can view menu images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'menu-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update menu images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'menu-images');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete menu images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'menu-images');
