-- =====================================================
-- STORAGE BUCKET MIGRATION
-- Run this in Supabase SQL Editor to fix the "Bucket not found" error
-- =====================================================

-- 1. Create the 'listings' bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (usually enabled by default, but good to ensure)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create Key Policies for the 'listings' bucket

-- Allow authenticated users to upload files to the 'listings' bucket
-- They can only upload to a folder named after their own User ID
CREATE POLICY "Authenticated users can upload listing photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'listings' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone (public) to view files in the 'listings' bucket
CREATE POLICY "Anyone can view listing photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'listings');

-- Allow users to update/delete their own files
CREATE POLICY "Users can update/delete own photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'listings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own photos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'listings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
