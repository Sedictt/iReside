-- Allow tenants to read neighbor leases in their property when names are public
BEGIN;

-- Helper functions avoid recursive lease checks inside the policy
CREATE OR REPLACE FUNCTION public.current_tenant_property_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT u.property_id
    FROM public.leases l
    JOIN public.units u ON u.id = l.unit_id
    WHERE l.tenant_id = auth.uid()
      AND l.status = 'active'
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.unit_property_id(target_unit_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT property_id
    FROM public.units
    WHERE id = target_unit_id;
$$;

-- Tenants can see leases in their property if the resident is public
DROP POLICY IF EXISTS "Tenants can view neighbor leases" ON public.leases;
CREATE POLICY "Tenants can view neighbor leases" ON public.leases
    FOR SELECT
    USING (
        public.current_tenant_property_id() IS NOT NULL
        AND public.current_tenant_property_id() = public.unit_property_id(leases.unit_id)
        AND (
            -- Always allow tenant to see their own lease
            leases.tenant_id = auth.uid()
            OR
            -- Allow neighbors only if their profile is public
            EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.id = leases.tenant_id
                  AND COALESCE(p.is_name_private, false) = false
            )
        )
    );

COMMIT;
