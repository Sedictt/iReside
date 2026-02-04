-- =====================================================
-- LISTING INQUIRIES SCHEMA
-- Run this in Supabase SQL Editor to add inquiry functionality
-- =====================================================

-- 1. Listing Inquiries Table
CREATE TABLE IF NOT EXISTS listing_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID REFERENCES property_listings(id) ON DELETE CASCADE NOT NULL,
    
    -- Inquirer Details
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    
    -- Inquiry Content
    message TEXT NOT NULL,
    preferred_move_in DATE,
    
    -- Status
    status TEXT CHECK (status IN ('new', 'read', 'replied', 'archived')) DEFAULT 'new',
    
    -- Metadata
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- If logged in
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    replied_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE listing_inquiries ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can submit an inquiry (public insert)
CREATE POLICY "Anyone can submit inquiries" ON listing_inquiries
    FOR INSERT WITH CHECK (true);

-- Landlords can view inquiries for their listings
CREATE POLICY "Landlords can view their listing inquiries" ON listing_inquiries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM property_listings
            WHERE property_listings.id = listing_inquiries.listing_id
            AND property_listings.landlord_id = auth.uid()
        )
    );

-- Landlords can update inquiry status
CREATE POLICY "Landlords can update their listing inquiries" ON listing_inquiries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM property_listings
            WHERE property_listings.id = listing_inquiries.listing_id
            AND property_listings.landlord_id = auth.uid()
        )
    );

-- Users can view their own inquiries (if logged in)
CREATE POLICY "Users can view own inquiries" ON listing_inquiries
    FOR SELECT USING (user_id = auth.uid());

-- Increment inquiry count on listing when new inquiry is created
CREATE OR REPLACE FUNCTION increment_listing_inquiry_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE property_listings
    SET inquiry_count = inquiry_count + 1
    WHERE id = NEW.listing_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_increment_inquiry_count
    AFTER INSERT ON listing_inquiries
    FOR EACH ROW EXECUTE FUNCTION increment_listing_inquiry_count();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_listing_id ON listing_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_status ON listing_inquiries(status);

SELECT 'Listing inquiries schema created successfully!' AS status;
