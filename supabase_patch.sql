-- PATCH: Add new tables for Invoices, Tasks, and Transactions
-- Run this SQL in your Supabase SQL Editor to add the new functionality

-- 7. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  tenant_name TEXT NOT NULL,
  tenant_email TEXT,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('paid', 'pending', 'overdue')) DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 8. Tasks (To-Do List)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 9. Transactions (Finances)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for new tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies for Invoices (drop if exists, then create)
DROP POLICY IF EXISTS "Landlords can manage their invoices" ON invoices;
CREATE POLICY "Landlords can manage their invoices" ON invoices
  FOR ALL USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Policies for Tasks
DROP POLICY IF EXISTS "Landlords can manage their tasks" ON tasks;
CREATE POLICY "Landlords can manage their tasks" ON tasks
  FOR ALL USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Policies for Transactions
DROP POLICY IF EXISTS "Landlords can manage their transactions" ON transactions;
CREATE POLICY "Landlords can manage their transactions" ON transactions
  FOR ALL USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- PATCH: Add Coordinates to Properties for Map Search
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
