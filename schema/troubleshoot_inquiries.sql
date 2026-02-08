-- =======================================================
-- TROUBLESHOOTING SCRIPT FOR LISTING INQUIRIES
-- Run this in Supabase SQL Editor to check your setup
-- =======================================================

-- 1. Check if listing_inquiries table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'listing_inquiries'
) AS table_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'listing_inquiries'
ORDER BY ordinal_position;

-- 3. Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'listing_inquiries';

-- 4. Check policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'listing_inquiries';

-- 5. Count total inquiries in the system
SELECT COUNT(*) as total_inquiries FROM listing_inquiries;

-- 6. Count inquiries by status
SELECT 
    status, 
    COUNT(*) as count 
FROM listing_inquiries 
GROUP BY status
ORDER BY count DESC;

-- 7. Check sample inquiries (landlord view)
SELECT 
    li.id,
    li.name,
    li.email,
    li.message,
    li.status,
    li.created_at,
    pl.title as property_title,
    pl.landlord_id
FROM listing_inquiries li
LEFT JOIN property_listings pl ON li.listing_id = pl.id
ORDER BY li.created_at DESC
LIMIT 5;

-- 8. Check if property_listings has landlord_id column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'property_listings'
AND column_name IN ('landlord_id', 'id');

-- 9. Test inquiry count by landlord
SELECT 
    pl.landlord_id,
    COUNT(li.id) as inquiry_count
FROM property_listings pl
LEFT JOIN listing_inquiries li ON pl.id = li.listing_id
GROUP BY pl.landlord_id
HAVING pl.landlord_id IS NOT NULL;

-- =======================================================
-- If the above queries run successfully, your schema is set up correctly!
-- If you see errors, note which query failed and check that section.
-- =======================================================
