-- =====================================================
-- AI PROPERTY CONCIERGE SCHEMA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.property_knowledge_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL, -- e.g., 'Wifi', 'Trash', 'Emergency', 'Rules'
    topic TEXT NOT NULL, -- e.g., 'Wifi Password', 'Sunday Trash Pickup'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE public.property_knowledge_base ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Landlords can view/edit their own property knowledge
CREATE POLICY "Landlords can manage their property knowledge" ON public.property_knowledge_base
    USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE id = property_knowledge_base.property_id 
            AND landlord_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE id = property_knowledge_base.property_id 
            AND landlord_id = auth.uid()
        )
    );

-- Tenants can view knowledge for their active unit's property
CREATE POLICY "Tenants can view property knowledge" ON public.property_knowledge_base
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.leases
            JOIN public.units ON leases.unit_id = units.id
            WHERE leases.tenant_id = auth.uid()
            AND leases.status = 'active'
            AND units.property_id = property_knowledge_base.property_id
        )
    );

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_knowledge_property ON public.property_knowledge_base(property_id);
