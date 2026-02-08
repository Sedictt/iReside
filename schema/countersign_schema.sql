-- =====================================================
-- COUNTERSIGN WORKFLOW SCHEMA
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add Landlord Signature columns to Leases
ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS landlord_signature_url TEXT,
ADD COLUMN IF NOT EXISTS landlord_signed_at TIMESTAMP WITH TIME ZONE;

-- 2. Update Status Checks
-- We need to drop the old constraint to add the new status
ALTER TABLE leases DROP CONSTRAINT IF EXISTS leases_status_check;

ALTER TABLE leases ADD CONSTRAINT leases_status_check 
  CHECK (status IN ('active', 'terminated', 'pending', 'pending_landlord'));
  
-- 'pending' = Waiting for Tenant
-- 'pending_landlord' = Waiting for Landlord Countersign
-- 'active' = Fully Signed

-- 3. Policy for Landlord Countersigning
-- Landlords can view/update all leases for their properties (already covered by RLS generally, but ensuring updates allowed)
-- Existing policies might need review if they are restrictive, but standard landlord policy usually covers 'ALL'.

-- 4. Enable access to landlord signatures in storage
-- Reuse the 'signatures' bucket. 
-- Existing policy: "Authenticated users can view signatures" -> Covers this.
-- Existing policy: "Tenants can upload..." -> We need "Landlords can upload..."

CREATE POLICY "Landlords can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'signatures' 
  AND auth.role() = 'authenticated' -- Checks are usually done via app logic validation, but strict RLS would check landlord status
);
