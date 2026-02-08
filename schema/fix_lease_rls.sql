-- =====================================================
-- FIX LEASE RLS POLICIES
-- Run this in Supabase SQL Editor to allow Landlords to create leases
-- =====================================================

-- 1. Tenants Policies (View Own, Update Own)
CREATE POLICY "Tenants can view own leases" ON leases
  FOR SELECT USING (auth.uid() = tenant_id);

-- Note: We already added "Tenants can update own lease" in lease_signing_schema.sql, 
-- but adding it here again with IF NOT EXISTS logic isn't standard SQL without a function.
-- safely skipping duplicate creation assumption or handled by user.


-- 2. Landlord Policies
-- Landlords need to View, Insert, Update, Delete leases for units they own.

-- Helper to check ownership via unit -> property -> landlord
-- This subquery strategy is standard for simple hierarchies.

CREATE POLICY "Landlords can view leases" ON leases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM units
      JOIN properties ON units.property_id = properties.id
      WHERE units.id = leases.unit_id
      AND properties.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can insert leases" ON leases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM units
      JOIN properties ON units.property_id = properties.id
      WHERE units.id = unit_id
      AND properties.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can update leases" ON leases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM units
      JOIN properties ON units.property_id = properties.id
      WHERE units.id = leases.unit_id
      AND properties.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can delete leases" ON leases
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM units
      JOIN properties ON units.property_id = properties.id
      WHERE units.id = leases.unit_id
      AND properties.landlord_id = auth.uid()
    )
  );
