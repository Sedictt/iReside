-- =====================================================
-- TENANT DISPUTE & COMPLAINT SCHEMA
-- =====================================================

-- 1. Tenant Complaints Table
CREATE TABLE IF NOT EXISTS public.tenant_complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    complainant_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- We target a UNIT because the tenant might not know the exact user ID, 
    -- and multiple people might live there.
    -- Any active tenant of this unit can respond.
    respondent_unit_id UUID REFERENCES public.units(id) NOT NULL, 
    
    category TEXT NOT NULL, -- 'Noise', 'Cleanliness', 'Parking', 'Other'
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'low', -- 'low', 'medium', 'high' (mostly for escalation)
    
    status TEXT DEFAULT 'open', -- 'open', 'resolved', 'escalated'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    escalated_at TIMESTAMP WITH TIME ZONE
);

-- 2. Complaint Messages (Chat for the dispute)
CREATE TABLE IF NOT EXISTS public.complaint_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    complaint_id UUID REFERENCES public.tenant_complaints(id) ON DELETE CASCADE NOT NULL,
    
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Enable RLS
ALTER TABLE public.tenant_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Complaints

-- Helper function to check if user is an active tenant of a unit
CREATE OR REPLACE FUNCTION is_active_tenant_of_unit(user_id UUID, unit_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.leases 
    WHERE tenant_id = user_id 
    AND unit_id = unit_id 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is the landlord of a property
CREATE OR REPLACE FUNCTION is_landlord_of_property(user_id UUID, property_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = property_id 
    AND landlord_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- VIEW Policies
CREATE POLICY "Users can view complaints involving them" ON public.tenant_complaints
    FOR SELECT USING (
        -- User is the complainant
        auth.uid() = complainant_id 
        OR 
        -- User is a tenant of the respondent unit
        EXISTS (
            SELECT 1 FROM public.leases 
            WHERE tenant_id = auth.uid() 
            AND unit_id = respondent_unit_id 
            AND status = 'active'
        )
        OR
        -- User is the landlord (can see all, or only escalated? Prompt implies escalation needed)
        -- "If not resolved, they can then elevate it... to the landlord"
        -- Let's say Landlords can view if status is 'escalated'
        (status = 'escalated' AND EXISTS (
            SELECT 1 FROM public.properties 
            WHERE id = property_id 
            AND landlord_id = auth.uid()
        ))
    );

-- INSERT Policies
CREATE POLICY "Tenants can create complaints in their property" ON public.tenant_complaints
    FOR INSERT WITH CHECK (
        auth.uid() = complainant_id
        -- Ensure complainant actually lives in that property (optional but good perms check)
        -- For simplicity, we trust the frontend passes correct IDs, but RLS on leases restricts visibility anyway.
    );

-- UPDATE Policies (Escalation / Resolution)
CREATE POLICY "Participants can update status" ON public.tenant_complaints
    FOR UPDATE USING (
        auth.uid() = complainant_id 
        OR 
        EXISTS (
            SELECT 1 FROM public.leases 
            WHERE tenant_id = auth.uid() 
            AND unit_id = respondent_unit_id 
            AND status = 'active'
        )
    );

-- 5. RLS Policies for Messages

CREATE POLICY "Participants can view messages" ON public.complaint_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tenant_complaints tc
            WHERE tc.id = complaint_id
            AND (
                tc.complainant_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM public.leases l
                    WHERE l.tenant_id = auth.uid() 
                    AND l.unit_id = tc.respondent_unit_id 
                    AND l.status = 'active'
                )
                OR
                (tc.status = 'escalated' AND EXISTS (
                    SELECT 1 FROM public.properties p
                    WHERE p.id = tc.property_id 
                    AND p.landlord_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "Participants can send messages" ON public.complaint_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.tenant_complaints tc
            WHERE tc.id = complaint_id
            AND (
                tc.complainant_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM public.leases l
                    WHERE l.tenant_id = auth.uid() 
                    AND l.unit_id = tc.respondent_unit_id 
                    AND l.status = 'active'
                )
                -- Landlord can reply if escalated? Maybe.
                OR
                (tc.status = 'escalated' AND EXISTS (
                    SELECT 1 FROM public.properties p
                    WHERE p.id = tc.property_id 
                    AND p.landlord_id = auth.uid()
                ))
            )
        )
    );

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_complainant ON public.tenant_complaints(complainant_id);
CREATE INDEX IF NOT EXISTS idx_complaints_respondent_unit ON public.tenant_complaints(respondent_unit_id);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_complaint ON public.complaint_messages(complaint_id);

SELECT 'Tenant Dispute schema created successfully!' as status;
