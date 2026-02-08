-- =======================================================
-- QUICK STATUS CHECK FOR INQUIRIES SYSTEM
-- Run this to see what data you currently have
-- =======================================================

-- 1. Check if you have any properties
SELECT 
    'YOUR PROPERTIES' as check_name,
    COUNT(*) as count,
    ARRAY_AGG(id::text) as property_ids
FROM property_listings
WHERE landlord_id = auth.uid();

-- 2. Check if there are ANY inquiries in the system
SELECT 
    'ALL INQUIRIES (SYSTEM-WIDE)' as check_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
    COUNT(CASE WHEN status = 'read' THEN 1 END) as read_count,
    COUNT(CASE WHEN status = 'replied' THEN 1 END) as replied_count,
    COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_count
FROM listing_inquiries;

-- 3. Check inquiries YOU can see (via RLS)
SELECT 
    'YOUR VISIBLE INQUIRIES (via RLS)' as check_name,
    COUNT(*) as count
FROM listing_inquiries;

-- 4. Show your inquiries with details
SELECT 
    li.id,
    li.name as inquirer_name,
    li.email,
    li.status,
    li.created_at,
    pl.title as property_title,
    pl.id as property_id,
    pl.landlord_id
FROM listing_inquiries li
LEFT JOIN property_listings pl ON li.listing_id = pl.id
WHERE pl.landlord_id = auth.uid()
ORDER BY li.created_at DESC
LIMIT 10;

-- 5. Check your user ID
SELECT 
    'YOUR USER INFO' as check_name,
    auth.uid() as your_user_id,
    (SELECT role FROM profiles WHERE id = auth.uid()) as your_role;

-- 6. Verify RLS policies exist
SELECT 
    'RLS POLICIES' as check_name,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'listing_inquiries';

-- =======================================================
-- INTERPRETATION:
-- - If "YOUR PROPERTIES" count is 0: You need to create properties first
-- - If "ALL INQUIRIES" count is 0: No one has submitted inquiries yet
-- - If "YOUR VISIBLE INQUIRIES" count is 0 but "ALL INQUIRIES" > 0: 
--   RLS is working, but those inquiries are for other landlords' properties
-- =======================================================
