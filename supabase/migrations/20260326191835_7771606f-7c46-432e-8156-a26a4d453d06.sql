-- Create a public bucket for client logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload client logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-logos');

-- Allow authenticated users to update logos
CREATE POLICY "Authenticated users can update client logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-logos');

-- Allow anyone to view logos (public bucket)
CREATE POLICY "Anyone can view client logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-logos');

-- Allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete client logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-logos');