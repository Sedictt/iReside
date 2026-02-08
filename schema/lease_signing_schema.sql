-- =====================================================
-- LEASE SIGNING & STORAGE SCHEMA
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Update Leases Table
ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;

-- 2. Create Storage Bucket for Signatures
-- Note: You need to create this bucket manually or via dashboard if script fails, 
-- but this script attempts to insert it into storage.buckets if permissions allow.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies for Signatures

-- Allow authenticated users (tenants) to upload their signature
CREATE POLICY "Tenants can upload their own signature"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'signatures' 
  AND auth.role() = 'authenticated'
);

-- Allow users to view signatures (Landlords need to see them, Tenants need to see their own)
-- For simplicity, we allow authenticated read. Stricter would be RLS based on lease ownership.
CREATE POLICY "Authenticated users can view signatures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'signatures' 
  AND auth.role() = 'authenticated'
);

-- 4. RLS for Leases (Update/Verify)
-- Ensure tenants can update their OWN lease (to add signature)
CREATE POLICY "Tenants can update own lease"
ON leases FOR UPDATE
USING (tenant_id = auth.uid())
WITH CHECK (tenant_id = auth.uid());
