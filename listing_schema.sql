-- =====================================================
-- PROPERTY LISTINGS SCHEMA
-- Run this in Supabase SQL Editor to add listing functionality
-- =====================================================

-- 1. Property Listings (extends properties with public-facing info)
CREATE TABLE IF NOT EXISTS property_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL UNIQUE,
    landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Listing Details
    title TEXT NOT NULL,
    headline TEXT, -- Short tagline
    description TEXT,
    
    -- Status & Visibility
    status TEXT CHECK (status IN ('draft', 'published', 'paused', 'archived')) DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Location Details (for public display)
    display_address TEXT, -- Can be partial address for privacy
    city TEXT NOT NULL,
    barangay TEXT,
    landmark TEXT,
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    
    -- Pricing Display
    price_range_min DECIMAL(12,2),
    price_range_max DECIMAL(12,2),
    price_display TEXT, -- e.g., "Starting at ₱5,000"
    
    -- Property Info
    property_type TEXT CHECK (property_type IN ('apartment', 'dormitory', 'boarding_house', 'condo', 'townhouse', 'house')) NOT NULL,
    total_units INTEGER DEFAULT 1,
    available_units INTEGER DEFAULT 0,
    
    -- Contact Preferences
    show_phone BOOLEAN DEFAULT true,
    contact_phone TEXT,
    show_email BOOLEAN DEFAULT true,
    contact_email TEXT,
    whatsapp_number TEXT,
    facebook_page TEXT,
    
    -- House Rules
    pets_allowed BOOLEAN DEFAULT false,
    smoking_allowed BOOLEAN DEFAULT false,
    visitors_allowed BOOLEAN DEFAULT true,
    curfew_time TIME,
    gender_restriction TEXT CHECK (gender_restriction IN ('male_only', 'female_only', 'couples_only', 'family_only', 'none')) DEFAULT 'none',
    
    -- Lease Terms
    min_lease_months INTEGER DEFAULT 1,
    max_lease_months INTEGER,
    deposit_months DECIMAL(3,1) DEFAULT 1.0, -- e.g., 1 month, 2 months
    advance_months DECIMAL(3,1) DEFAULT 1.0,
    
    -- SEO & Discovery
    slug TEXT UNIQUE, -- URL-friendly slug
    meta_description TEXT,
    keywords TEXT[], -- For search
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Listing Photos
CREATE TABLE IF NOT EXISTS listing_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID REFERENCES property_listings(id) ON DELETE CASCADE NOT NULL,
    
    -- Photo Details
    url TEXT NOT NULL,
    storage_path TEXT, -- Supabase storage path
    alt_text TEXT,
    caption TEXT,
    
    -- Organization
    photo_type TEXT CHECK (photo_type IN ('cover', 'exterior', 'interior', 'amenity', 'unit', 'floor_plan', 'document')) DEFAULT 'interior',
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    
    -- Metadata
    width INTEGER,
    height INTEGER,
    file_size INTEGER, -- in bytes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Unit Photos (for individual units within a listing)
CREATE TABLE IF NOT EXISTS unit_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
    
    url TEXT NOT NULL,
    storage_path TEXT,
    alt_text TEXT,
    caption TEXT,
    
    photo_type TEXT CHECK (photo_type IN ('bedroom', 'bathroom', 'kitchen', 'living', 'balcony', 'other')) DEFAULT 'other',
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Amenities
CREATE TABLE IF NOT EXISTS amenities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT, -- Lucide icon name
    category TEXT CHECK (category IN ('basic', 'comfort', 'safety', 'outdoor', 'services')) DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. Listing Amenities (Many-to-Many)
CREATE TABLE IF NOT EXISTS listing_amenities (
    listing_id UUID REFERENCES property_listings(id) ON DELETE CASCADE,
    amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
    is_highlighted BOOLEAN DEFAULT false,
    additional_info TEXT,
    PRIMARY KEY (listing_id, amenity_id)
);

-- 6. Unit Amenities (Many-to-Many for unit-specific amenities)
CREATE TABLE IF NOT EXISTS unit_amenities (
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (unit_id, amenity_id)
);

-- 7. Listing Statistics (for analytics)
CREATE TABLE IF NOT EXISTS listing_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID REFERENCES property_listings(id) ON DELETE CASCADE NOT NULL,
    viewer_ip TEXT,
    user_agent TEXT,
    referrer TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES
-- =====================================================

-- Property Listings (Landlords manage own, public can view published)
CREATE POLICY "Landlords can manage their listings" ON property_listings
    FOR ALL USING (landlord_id = auth.uid())
    WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Public can view published listings" ON property_listings
    FOR SELECT USING (status = 'published');

-- Listing Photos (Landlords manage own, public can view published listing photos)
CREATE POLICY "Landlords can manage listing photos" ON listing_photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM property_listings
            WHERE property_listings.id = listing_photos.listing_id
            AND property_listings.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Public can view photos of published listings" ON listing_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM property_listings
            WHERE property_listings.id = listing_photos.listing_id
            AND property_listings.status = 'published'
        )
    );

-- Unit Photos (Landlords manage own)
CREATE POLICY "Landlords can manage unit photos" ON unit_photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM units
            JOIN properties ON properties.id = units.property_id
            WHERE units.id = unit_photos.unit_id
            AND properties.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Public can view unit photos" ON unit_photos
    FOR SELECT USING (true);

-- Amenities (Public read, admin write)
CREATE POLICY "Anyone can view amenities" ON amenities
    FOR SELECT USING (true);

-- Listing Amenities
CREATE POLICY "Landlords can manage listing amenities" ON listing_amenities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM property_listings
            WHERE property_listings.id = listing_amenities.listing_id
            AND property_listings.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Public can view amenities of published listings" ON listing_amenities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM property_listings
            WHERE property_listings.id = listing_amenities.listing_id
            AND property_listings.status = 'published'
        )
    );

-- Unit Amenities
CREATE POLICY "Landlords can manage unit amenities" ON unit_amenities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM units
            JOIN properties ON properties.id = units.property_id
            WHERE units.id = unit_amenities.unit_id
            AND properties.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Public can view unit amenities" ON unit_amenities
    FOR SELECT USING (true);

-- Listing Views (anyone can insert, landlords can view own)
CREATE POLICY "Anyone can log listing views" ON listing_views
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Landlords can view their listing analytics" ON listing_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM property_listings
            WHERE property_listings.id = listing_views.listing_id
            AND property_listings.landlord_id = auth.uid()
        )
    );

-- =====================================================
-- SEED DEFAULT AMENITIES
-- =====================================================
INSERT INTO amenities (name, icon, category) VALUES
-- Basic
('WiFi', 'Wifi', 'basic'),
('Air Conditioning', 'Snowflake', 'basic'),
('Water Heater', 'Flame', 'basic'),
('Electricity Included', 'Zap', 'basic'),
('Water Included', 'Droplets', 'basic'),
('Furnished', 'Sofa', 'basic'),
('Kitchen Access', 'ChefHat', 'basic'),
('Laundry Area', 'Shirt', 'basic'),
('Shared Bathroom', 'Bath', 'basic'),
('Private Bathroom', 'ShowerHead', 'basic'),

-- Comfort
('TV / Cable', 'Tv', 'comfort'),
('Refrigerator', 'Refrigerator', 'comfort'),
('Study Desk', 'Laptop', 'comfort'),
('Wardrobe', 'Archive', 'comfort'),
('Bed Frame', 'BedDouble', 'comfort'),
('Mattress Included', 'BedSingle', 'comfort'),

-- Safety
('CCTV', 'Camera', 'safety'),
('Security Guard', 'ShieldCheck', 'safety'),
('Fire Extinguisher', 'Flame', 'safety'),
('Emergency Exit', 'DoorOpen', 'safety'),
('Gated Entrance', 'Lock', 'safety'),

-- Outdoor
('Parking', 'Car', 'outdoor'),
('Motorcycle Parking', 'Bike', 'outdoor'),
('Rooftop Access', 'Sun', 'outdoor'),
('Garden Area', 'Trees', 'outdoor'),
('Balcony', 'Fence', 'outdoor'),

-- Services
('Cleaning Service', 'Sparkles', 'services'),
('Laundry Service', 'WashingMachine', 'services'),
('24/7 Access', 'Clock', 'services'),
('Package Receiving', 'Package', 'services'),
('Maintenance Support', 'Wrench', 'services')

ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Auto-generate slug from title
CREATE OR REPLACE FUNCTION generate_listing_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_listing_slug
    BEFORE INSERT OR UPDATE ON property_listings
    FOR EACH ROW EXECUTE FUNCTION generate_listing_slug();

-- Update timestamp on listing update
CREATE OR REPLACE FUNCTION update_listing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_listing_updated_at
    BEFORE UPDATE ON property_listings
    FOR EACH ROW EXECUTE FUNCTION update_listing_timestamp();

-- Increment view count
CREATE OR REPLACE FUNCTION increment_listing_view(listing_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE property_listings
    SET view_count = view_count + 1
    WHERE id = listing_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STORAGE BUCKET SETUP (Run manually in Supabase Dashboard)
-- =====================================================
-- 1. Create a new storage bucket named 'listings'
-- 2. Enable public access for the bucket
-- 3. Add RLS policies:
--    - INSERT: Authenticated users can upload to their own folder
--    - SELECT: Public read access
--    - DELETE: Only owner can delete

-- Example storage policies (run in SQL editor):
INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true);

-- storage.objects policies:
CREATE POLICY "Authenticated users can upload listing photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'listings' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view listing photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'listings');

CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);

SELECT 'Listing schema created successfully!' AS status;
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
