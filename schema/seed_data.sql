-- SEED DATA: Run this in Supabase SQL Editor to populate your database with test data
-- This script creates realistic sample data for the Tenant Platform

-- =====================================================
-- STEP 1: Create test users (profiles)
-- Note: These reference auth.users, so we'll use a workaround
-- =====================================================

-- First, let's create some UUIDs we'll reuse
DO $$ 
DECLARE
    landlord_1_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    landlord_2_id UUID := 'b2c3d4e5-f6a7-8901-bcde-f23456789012';
    tenant_1_id UUID := 'c3d4e5f6-a7b8-9012-cdef-345678901234';
    tenant_2_id UUID := 'd4e5f6a7-b8c9-0123-defa-456789012345';
    tenant_3_id UUID := 'e5f6a7b8-c9d0-1234-efab-567890123456';
BEGIN
    -- Insert profiles (bypassing auth.users FK for seeding)
    -- You may need to disable the FK temporarily or create matching auth.users
    
    RAISE NOTICE 'Seed data variables created. Run the INSERT statements below.';
END $$;

-- =====================================================
-- PROPERTIES (Valenzuela City, Metro Manila area)
-- =====================================================

INSERT INTO properties (id, landlord_id, name, address, description, lat, lng) VALUES
-- Property 1: Apartment Complex
('11111111-1111-1111-1111-111111111111', 
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'Sunrise Residences',
 '123 Karuhatan Road, Valenzuela City',
 'Modern apartment complex with 24/7 security, parking, and amenities.',
 14.6819, 120.9772),

-- Property 2: Student Dormitory
('22222222-2222-2222-2222-222222222222',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'UE Dormitory',
 '456 MacArthur Highway, Valenzuela City',
 'Affordable student housing near universities. Includes WiFi and study areas.',
 14.6752, 120.9835),

-- Property 3: Condo Units
('33333333-3333-3333-3333-333333333333',
 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
 'Green Valley Condos',
 '789 Gen. T. de Leon, Valenzuela City',
 'Luxury condominium with pool, gym, and rooftop garden.',
 14.6901, 120.9698),

-- Property 4: Townhouse Complex
('44444444-4444-4444-4444-444444444444',
 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
 'Casa Bonita Townhomes',
 '321 Paso de Blas, Valenzuela City',
 'Family-friendly townhouse community with playground and community center.',
 14.6785, 120.9621),

-- Property 5: Budget Apartments
('55555555-5555-5555-5555-555555555555',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'Metro Living Apartments',
 '555 Malinta Exit, Valenzuela City',
 'Affordable units for young professionals. Near NLEX.',
 14.6943, 120.9756)

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- UNITS (Various types and prices)
-- =====================================================

INSERT INTO units (id, property_id, unit_number, unit_type, rent_amount, status, grid_x, grid_y) VALUES
-- Sunrise Residences Units
('u1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '101', 'studio', 8000, 'available', 0, 0),
('u1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '102', 'studio', 8000, 'occupied', 1, 0),
('u1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', '201', '1br', 12000, 'available', 0, 1),
('u1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', '202', '1br', 12000, 'occupied', 1, 1),
('u1111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', '301', '2br', 18000, 'neardue', 0, 2),
('u1111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111111', '302', '2br', 18000, 'maintenance', 1, 2),

-- UE Dormitory Units
('u2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'A1', 'dorm', 3500, 'occupied', 0, 0),
('u2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'A2', 'dorm', 3500, 'occupied', 1, 0),
('u2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'A3', 'dorm', 3500, 'available', 2, 0),
('u2222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', 'B1', 'dorm', 4000, 'available', 0, 1),
('u2222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222222', 'B2', 'dorm', 4000, 'occupied', 1, 1),

-- Green Valley Condos Units
('u3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'Unit 1A', '1br', 25000, 'occupied', 0, 0),
('u3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'Unit 1B', '2br', 35000, 'available', 1, 0),
('u3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Unit 2A', '2br', 35000, 'neardue', 0, 1),
('u3333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'Penthouse', '3br', 55000, 'occupied', 1, 1),

-- Casa Bonita Townhomes
('u4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', 'TH-1', '3br', 20000, 'occupied', 0, 0),
('u4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', 'TH-2', '3br', 20000, 'available', 1, 0),
('u4444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', 'TH-3', '3br', 22000, 'occupied', 2, 0),

-- Metro Living Units
('u5555555-5555-5555-5555-555555555551', '55555555-5555-5555-5555-555555555555', 'M101', 'studio', 6500, 'available', 0, 0),
('u5555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555555', 'M102', 'studio', 6500, 'occupied', 1, 0),
('u5555555-5555-5555-5555-555555555553', '55555555-5555-5555-5555-555555555555', 'M103', 'studio', 6500, 'available', 2, 0),
('u5555555-5555-5555-5555-555555555554', '55555555-5555-5555-5555-555555555555', 'M201', '1br', 9000, 'occupied', 0, 1)

ON CONFLICT (id) DO NOTHING;

-- Backfill top-down map fields for seeded units
UPDATE units
SET
    map_x = grid_x,
    map_y = grid_y,
    map_floor = 1
WHERE map_x IS NULL OR map_y IS NULL OR map_floor IS NULL;

-- =====================================================
-- MAINTENANCE REQUESTS
-- =====================================================

INSERT INTO maintenance_requests (id, property_id, unit_id, title, description, priority, status) VALUES
('mr111111-1111-1111-1111-111111111111',
 '11111111-1111-1111-1111-111111111111',
 'u1111111-1111-1111-1111-111111111116',
 'AC Unit Not Working',
 'The aircon in unit 302 stopped cooling. Tenant reports it just blows warm air.',
 'critical',
 'in_progress'),

('mr222222-2222-2222-2222-222222222222',
 '11111111-1111-1111-1111-111111111111',
 'u1111111-1111-1111-1111-111111111112',
 'Leaky Faucet',
 'Kitchen faucet has a slow drip. Not urgent but wastes water.',
 'info',
 'open'),

('mr333333-3333-3333-3333-333333333333',
 '33333333-3333-3333-3333-333333333333',
 'u3333333-3333-3333-3333-333333333331',
 'Elevator Maintenance',
 'Building elevator making unusual sounds. Needs inspection.',
 'warning',
 'open'),

('mr444444-4444-4444-4444-444444444444',
 '22222222-2222-2222-2222-222222222222',
 NULL,
 'WiFi Router Replacement',
 'Common area WiFi router needs upgrade. Students complaining about slow speeds.',
 'warning',
 'resolved'),

('mr555555-5555-5555-5555-555555555555',
 '44444444-4444-4444-4444-444444444444',
 'u4444444-4444-4444-4444-444444444441',
 'Gate Lock Broken',
 'Main gate electronic lock not responding to key fob.',
 'critical',
 'open')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- INQUIRIES
-- =====================================================

INSERT INTO inquiries (id, property_id, name, email, message, status) VALUES
('iq111111-1111-1111-1111-111111111111',
 '11111111-1111-1111-1111-111111111111',
 'Maria Santos',
 'maria.santos@email.com',
 'Hi! I am interested in renting a 1BR unit. Is unit 201 still available? Can I schedule a viewing this weekend?',
 'new'),

('iq222222-2222-2222-2222-222222222222',
 '22222222-2222-2222-2222-222222222222',
 'Juan dela Cruz',
 'juan.delacruz@email.com',
 'Good day! I am a UE student looking for dorm accommodation. Do you have available beds for the upcoming semester?',
 'read'),

('iq333333-3333-3333-3333-333333333333',
 '33333333-3333-3333-3333-333333333333',
 'Robert Tan',
 'robert.tan@company.com',
 'Interested in the 2BR unit for my family. What amenities are included? Is parking available?',
 'new'),

('iq444444-4444-4444-4444-444444444444',
 '55555555-5555-5555-5555-555555555555',
 'Ana Reyes',
 'ana.reyes@startup.ph',
 'Looking for affordable studio near NLEX. How much is the deposit? Are pets allowed?',
 'archived')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TASKS (To-Do List)
-- =====================================================

INSERT INTO tasks (id, landlord_id, property_id, title, description, priority, status, due_date) VALUES
('tk111111-1111-1111-1111-111111111111',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 '11111111-1111-1111-1111-111111111111',
 'Collect February Rent',
 'Follow up with tenants who havent paid yet.',
 'high',
 'pending',
 '2026-02-05'),

('tk222222-2222-2222-2222-222222222222',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 '22222222-2222-2222-2222-222222222222',
 'Renew Fire Insurance',
 'Policy expires end of month. Contact insurance agent.',
 'medium',
 'in_progress',
 '2026-02-28'),

('tk333333-3333-3333-3333-333333333333',
 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
 '33333333-3333-3333-3333-333333333333',
 'Schedule Pool Cleaning',
 'Monthly pool maintenance due.',
 'low',
 'completed',
 '2026-02-01'),

('tk444444-4444-4444-4444-444444444444',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 NULL,
 'Update Lease Templates',
 'Add new clauses for pet policy.',
 'medium',
 'pending',
 '2026-02-15'),

('tk555555-5555-5555-5555-555555555555',
 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
 '44444444-4444-4444-4444-444444444444',
 'Repaint Common Areas',
 'Get quotes from 3 contractors.',
 'low',
 'pending',
 '2026-03-01')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- INVOICES
-- =====================================================

INSERT INTO invoices (id, landlord_id, unit_id, tenant_name, tenant_email, description, amount, due_date, status) VALUES
('iv111111-1111-1111-1111-111111111111',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'u1111111-1111-1111-1111-111111111112',
 'Pedro Garcia',
 'pedro.garcia@email.com',
 'February 2026 Rent - Unit 102',
 8000,
 '2026-02-05',
 'pending'),

('iv222222-2222-2222-2222-222222222222',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'u1111111-1111-1111-1111-111111111114',
 'Carmen Lopez',
 'carmen.lopez@email.com',
 'February 2026 Rent - Unit 202',
 12000,
 '2026-02-05',
 'paid'),

('iv333333-3333-3333-3333-333333333333',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'u1111111-1111-1111-1111-111111111115',
 'Jose Rizal Jr.',
 'jose.rizal@email.com',
 'February 2026 Rent - Unit 301',
 18000,
 '2026-02-05',
 'overdue'),

('iv444444-4444-4444-4444-444444444444',
 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
 'u3333333-3333-3333-3333-333333333331',
 'Michael Tan',
 'michael.tan@corp.com',
 'February 2026 Rent - Unit 1A',
 25000,
 '2026-02-01',
 'paid'),

('iv555555-5555-5555-5555-555555555555',
 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
 'u3333333-3333-3333-3333-333333333334',
 'The Villanueva Family',
 'villanueva@family.ph',
 'February 2026 Rent - Penthouse',
 55000,
 '2026-02-01',
 'pending')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TRANSACTIONS (Finances)
-- =====================================================

INSERT INTO transactions (id, landlord_id, property_id, type, category, description, amount, date) VALUES
-- Income
('tr111111-1111-1111-1111-111111111111',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 '11111111-1111-1111-1111-111111111111',
 'income', 'rent',
 'January 2026 Rent Collection',
 58000,
 '2026-01-05'),

('tr222222-2222-2222-2222-222222222222',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 '22222222-2222-2222-2222-222222222222',
 'income', 'rent',
 'January 2026 Dorm Fees',
 18500,
 '2026-01-03'),

('tr333333-3333-3333-3333-333333333333',
 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
 '33333333-3333-3333-3333-333333333333',
 'income', 'rent',
 'January 2026 Condo Rent',
 115000,
 '2026-01-02'),

-- Expenses
('tr444444-4444-4444-4444-444444444444',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 '11111111-1111-1111-1111-111111111111',
 'expense', 'maintenance',
 'AC Repair - Unit 302',
 4500,
 '2026-01-15'),

('tr555555-5555-5555-5555-555555555555',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 '11111111-1111-1111-1111-111111111111',
 'expense', 'utilities',
 'Common Area Electric Bill',
 8200,
 '2026-01-20'),

('tr666666-6666-6666-6666-666666666666',
 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
 '33333333-3333-3333-3333-333333333333',
 'expense', 'maintenance',
 'Pool Cleaning Service',
 3500,
 '2026-01-10'),

('tr777777-7777-7777-7777-777777777777',
 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 '22222222-2222-2222-2222-222222222222',
 'expense', 'other',
 'WiFi Router Upgrade',
 5800,
 '2026-01-25'),

('tr888888-8888-8888-8888-888888888888',
 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
 '44444444-4444-4444-4444-444444444444',
 'expense', 'utilities',
 'Water Bill - Townhouses',
 2400,
 '2026-01-18')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Properties: 5
-- Units: 22
-- Maintenance Requests: 5
-- Inquiries: 4
-- Tasks: 5
-- Invoices: 5
-- Transactions: 8

SELECT 'Seed data inserted successfully!' AS status;
