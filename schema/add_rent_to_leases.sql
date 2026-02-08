-- =====================================================
-- FIX MISSING LEASE COLUMNS
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add rent_amount to leases table
-- It seems this column was missing in the initial schema but is required by the app
ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS rent_amount DECIMAL(12,2) DEFAULT 0.00;

-- 2. Force Schema Cache Reload (Optional, usually automatic)
NOTIFY pgrst, 'reload config';
