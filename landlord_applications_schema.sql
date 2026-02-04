-- =====================================================
-- LANDLORD APPLICATIONS SCHEMA MIGRATION
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- 1. Update profiles table to add 'pending' as a valid role option
-- First, drop the existing constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the updated constraint with 'pending' role
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('landlord', 'tenant', 'admin'));

-- Add phone column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- 2. Create Landlord Applications Table
CREATE TABLE IF NOT EXISTS landlord_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Business/Contact Information
  business_name TEXT,
  business_address TEXT NOT NULL,
  phone TEXT NOT NULL,
  
  -- Document URLs (stored in Supabase Storage)
  government_id_url TEXT NOT NULL,
  property_document_url TEXT,  -- Optional: Property title, tax declaration, etc.
  business_permit_url TEXT,     -- Optional: Mayor's permit, DTI, etc.
  
  -- Application Status
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')) DEFAULT 'pending',
  rejection_reason TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- 3. Enable Row Level Security
ALTER TABLE landlord_applications ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Landlord Applications

-- Users can view their own applications
CREATE POLICY "Users can view own application" ON landlord_applications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own application (only one per user due to UNIQUE constraint)
CREATE POLICY "Users can submit application" ON landlord_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending application
CREATE POLICY "Users can update own pending application" ON landlord_applications
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all applications (for future admin panel)
CREATE POLICY "Admins can view all applications" ON landlord_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admins can update any application
CREATE POLICY "Admins can update applications" ON landlord_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 5. Function to handle landlord application approval
CREATE OR REPLACE FUNCTION approve_landlord_application(application_id UUID)
RETURNS VOID AS $$
DECLARE
  app_user_id UUID;
BEGIN
  -- Get the user_id from the application
  SELECT user_id INTO app_user_id 
  FROM landlord_applications 
  WHERE id = application_id;
  
  -- Update the application status
  UPDATE landlord_applications 
  SET status = 'approved', 
      reviewed_at = NOW(),
      reviewed_by = auth.uid()
  WHERE id = application_id;
  
  -- Update the user's profile role to landlord
  UPDATE profiles 
  SET role = 'landlord' 
  WHERE id = app_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to handle landlord application rejection
CREATE OR REPLACE FUNCTION reject_landlord_application(application_id UUID, reason TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE landlord_applications 
  SET status = 'rejected', 
      rejection_reason = reason,
      reviewed_at = NOW(),
      reviewed_by = auth.uid()
  WHERE id = application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update the new user trigger to always set role as 'tenant'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'tenant',  -- Always start as tenant
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create storage bucket for application documents (run in Supabase Dashboard > Storage)
-- Note: You need to create this bucket manually or via the Supabase Dashboard:
-- Bucket name: 'applications'
-- Public: false (private bucket)

-- 9. Storage policies for applications bucket
-- INSERT policy - users can upload their own documents
-- CREATE POLICY "Users can upload application docs"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'applications' 
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- SELECT policy - users can view their own documents
-- CREATE POLICY "Users can view own application docs"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'applications' 
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- =====================================================
-- VERIFICATION STEPS:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Create 'applications' storage bucket in Supabase Dashboard
-- 3. Set bucket to private
-- 4. Add storage policies as shown above
-- =====================================================
