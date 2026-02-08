-- CRITICAL FIX: Run this to enable the Search Page functionality

-- 1. Ensure Map Coordinates Exist
-- The search page queries 'lat' and 'lng'. If these columns don't exist, the page will crash.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- 2. ENABLE PUBLIC ACCESS
-- By default, RLS (Row Level Security) hides data. 
-- We must explicitly allow everyone (tenants/public) to VIEW properties and units.

-- properties permissions
DROP POLICY IF EXISTS "Public properties read access" ON properties;
CREATE POLICY "Public properties read access" 
ON properties FOR SELECT 
USING (true);

-- units permissions (needed to display price ranges)
DROP POLICY IF EXISTS "Public units read access" ON units;
CREATE POLICY "Public units read access" 
ON units FOR SELECT 
USING (true);

-- 3. (Optional) Add some dummy coordinates to existing properties for testing
-- This updates properties without coordinates to be somewhere in Valenzuela City
UPDATE properties 
SET 
  lat = 14.6819 + (random() * 0.01 - 0.005),
  lng = 120.9772 + (random() * 0.01 - 0.005)
WHERE lat IS NULL OR lng IS NULL;
