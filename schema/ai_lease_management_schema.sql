-- AI Lease Management Schema
-- This schema adds support for AI-powered lease contract management
-- Features: early termination handling, penalty calculations, contract parsing

-- 1. Lease Contracts Table (Extended from leases)
-- Stores detailed contract terms for AI parsing
CREATE TABLE IF NOT EXISTS lease_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Core Contract Terms
  contract_start_date DATE NOT NULL,
  contract_end_date DATE NOT NULL,
  monthly_rent DECIMAL(12,2) NOT NULL,
  security_deposit DECIMAL(12,2) DEFAULT 0,
  
  -- Lock-in Period Terms
  lock_in_months INTEGER DEFAULT 0,
  lock_in_end_date DATE,
  
  -- Early Termination Penalties
  early_termination_penalty_type TEXT CHECK (early_termination_penalty_type IN ('fixed', 'months_rent', 'percentage_remaining', 'none')) DEFAULT 'none',
  early_termination_penalty_value DECIMAL(12,2) DEFAULT 0,
  notice_period_days INTEGER DEFAULT 30,
  
  -- Contract Document
  contract_document_url TEXT,
  contract_parsed_at TIMESTAMP WITH TIME ZONE,
  ai_extracted_terms JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Termination Requests Table
-- Tracks tenant requests for early termination
CREATE TABLE IF NOT EXISTS termination_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_contract_id UUID REFERENCES lease_contracts(id) ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Request Details
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_move_out_date DATE NOT NULL,
  reason TEXT,
  
  -- AI Calculated Penalty
  calculated_penalty DECIMAL(12,2),
  penalty_breakdown JSONB,
  remaining_months DECIMAL(5,2),
  is_within_lock_in BOOLEAN DEFAULT false,
  
  -- Status & Response
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'negotiating', 'completed')) DEFAULT 'pending',
  ai_suggested_response TEXT,
  landlord_response TEXT,
  landlord_response_at TIMESTAMP WITH TIME ZONE,
  
  -- Email Communication
  email_subject TEXT,
  email_body TEXT,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Lease Renewal Reminders Table
-- Tracks upcoming lease renewals
CREATE TABLE IF NOT EXISTS lease_renewals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_contract_id UUID REFERENCES lease_contracts(id) ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Renewal Details
  expiry_date DATE NOT NULL,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  days_until_expiry INTEGER,
  
  -- AI Suggestions
  suggested_new_rent DECIMAL(12,2),
  market_rate_analysis JSONB,
  ai_renewal_terms TEXT,
  
  -- Action
  status TEXT CHECK (status IN ('pending', 'renewed', 'not_renewed', 'terminated')) DEFAULT 'pending',
  new_lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for new tables
ALTER TABLE lease_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE termination_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_renewals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lease_contracts
DROP POLICY IF EXISTS "Landlords can manage their lease contracts" ON lease_contracts;
CREATE POLICY "Landlords can manage their lease contracts" ON lease_contracts
  FOR ALL USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- RLS Policies for termination_requests
DROP POLICY IF EXISTS "Landlords can manage their termination requests" ON termination_requests;
CREATE POLICY "Landlords can manage their termination requests" ON termination_requests
  FOR ALL USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- RLS Policies for lease_renewals
DROP POLICY IF EXISTS "Landlords can manage their lease renewals" ON lease_renewals;
CREATE POLICY "Landlords can manage their lease renewals" ON lease_renewals
  FOR ALL USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lease_contracts_landlord ON lease_contracts(landlord_id);
CREATE INDEX IF NOT EXISTS idx_termination_requests_landlord ON termination_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_termination_requests_status ON termination_requests(status);
CREATE INDEX IF NOT EXISTS idx_lease_renewals_expiry ON lease_renewals(expiry_date);

-- Function to calculate early termination penalty
CREATE OR REPLACE FUNCTION calculate_termination_penalty(
  p_contract_id UUID,
  p_move_out_date DATE
) RETURNS TABLE (
  penalty_amount DECIMAL(12,2),
  remaining_months DECIMAL(5,2),
  is_within_lock_in BOOLEAN,
  breakdown JSONB
) AS $$
DECLARE
  v_contract RECORD;
  v_remaining_months DECIMAL(5,2);
  v_penalty DECIMAL(12,2);
  v_is_within_lock_in BOOLEAN;
  v_breakdown JSONB;
BEGIN
  -- Get contract details
  SELECT * INTO v_contract FROM lease_contracts WHERE id = p_contract_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;
  
  -- Calculate remaining months
  v_remaining_months := EXTRACT(MONTH FROM AGE(v_contract.contract_end_date, p_move_out_date)) +
                       (EXTRACT(YEAR FROM AGE(v_contract.contract_end_date, p_move_out_date)) * 12) +
                       (EXTRACT(DAY FROM AGE(v_contract.contract_end_date, p_move_out_date)) / 30.0);
  
  -- Check if within lock-in period
  v_is_within_lock_in := p_move_out_date < COALESCE(v_contract.lock_in_end_date, v_contract.contract_start_date);
  
  -- Calculate penalty based on type
  CASE v_contract.early_termination_penalty_type
    WHEN 'fixed' THEN
      v_penalty := v_contract.early_termination_penalty_value;
    WHEN 'months_rent' THEN
      v_penalty := v_contract.early_termination_penalty_value * v_contract.monthly_rent;
    WHEN 'percentage_remaining' THEN
      v_penalty := (v_contract.early_termination_penalty_value / 100) * (v_remaining_months * v_contract.monthly_rent);
    ELSE
      v_penalty := 0;
  END CASE;
  
  -- Build breakdown
  v_breakdown := jsonb_build_object(
    'monthly_rent', v_contract.monthly_rent,
    'remaining_months', v_remaining_months,
    'penalty_type', v_contract.early_termination_penalty_type,
    'penalty_value', v_contract.early_termination_penalty_value,
    'within_lock_in', v_is_within_lock_in,
    'lock_in_end_date', v_contract.lock_in_end_date
  );
  
  penalty_amount := v_penalty;
  remaining_months := v_remaining_months;
  is_within_lock_in := v_is_within_lock_in;
  breakdown := v_breakdown;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE lease_contracts IS 'Stores detailed lease contract terms for AI parsing and penalty calculations';
COMMENT ON TABLE termination_requests IS 'Tracks early termination requests from tenants with AI-calculated penalties';
COMMENT ON TABLE lease_renewals IS 'Manages lease renewal reminders with AI-suggested terms';
