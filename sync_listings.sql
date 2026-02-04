-- =====================================================
-- SYNC PROPERTIES/UNITS TO LISTINGS
-- =====================================================

-- 1. Sync Property Details (Name, Address) to Listing
CREATE OR REPLACE FUNCTION sync_property_details_to_listing()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE property_listings
    SET
        title = NEW.name,
        display_address = NEW.address,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE property_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_property_details ON properties;
CREATE TRIGGER trigger_sync_property_details
    AFTER UPDATE OF name, address
    ON properties
    FOR EACH ROW
    EXECUTE FUNCTION sync_property_details_to_listing();

-- 2. Sync Unit Statistics (Counts, Prices) to Listing
CREATE OR REPLACE FUNCTION sync_listing_stats_from_units()
RETURNS TRIGGER AS $$
DECLARE
    target_property_id UUID;
    total_count INTEGER;
    available_count INTEGER;
    min_price DECIMAL(12,2);
    max_price DECIMAL(12,2);
BEGIN
    -- Determine property_id based on operation
    IF (TG_OP = 'DELETE') THEN
        target_property_id := OLD.property_id;
    ELSE
        target_property_id := NEW.property_id;
    END IF;

    -- Calculate stats
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'available'),
        MIN(rent_amount),
        MAX(rent_amount)
    INTO 
        total_count,
        available_count,
        min_price,
        max_price
    FROM units
    WHERE property_id = target_property_id;

    -- Update listing
    UPDATE property_listings
    SET
        total_units = COALESCE(total_count, 0),
        available_units = COALESCE(available_count, 0),
        price_range_min = min_price,
        price_range_max = max_price,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE property_id = target_property_id;

    -- If UPDATE and property_id changed (unlikely but possible), update old property too
    IF (TG_OP = 'UPDATE' AND OLD.property_id IS DISTINCT FROM NEW.property_id) THEN
        -- Recalculate for OLD property
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE status = 'available'),
            MIN(rent_amount),
            MAX(rent_amount)
        INTO 
            total_count,
            available_count,
            min_price,
            max_price
        FROM units
        WHERE property_id = OLD.property_id;

        UPDATE property_listings
        SET
            total_units = COALESCE(total_count, 0),
            available_units = COALESCE(available_count, 0),
            price_range_min = min_price,
            price_range_max = max_price,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE property_id = OLD.property_id;
    END IF;

    RETURN NULL; -- Result is ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_listing_stats ON units;
CREATE TRIGGER trigger_sync_listing_stats
    AFTER INSERT OR UPDATE OR DELETE
    ON units
    FOR EACH ROW
    EXECUTE FUNCTION sync_listing_stats_from_units();

-- 3. One-time Manual Sync for Existing Data
-- Sync details
UPDATE property_listings pl
SET
    title = p.name,
    display_address = p.address
FROM properties p
WHERE pl.property_id = p.id
AND (pl.title IS DISTINCT FROM p.name OR pl.display_address IS DISTINCT FROM p.address);

-- Sync stats
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM properties LOOP
        -- Calculate stats for each property
        UPDATE property_listings pl
        SET
            total_units = (SELECT COUNT(*) FROM units u WHERE u.property_id = r.id),
            available_units = (SELECT COUNT(*) FROM units u WHERE u.property_id = r.id AND u.status = 'available'),
            price_range_min = (SELECT MIN(rent_amount) FROM units u WHERE u.property_id = r.id),
            price_range_max = (SELECT MAX(rent_amount) FROM units u WHERE u.property_id = r.id)
        WHERE pl.property_id = r.id;
    END LOOP;
END $$;
