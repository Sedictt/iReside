-- Add top-down unit map fields and corridor tiles
BEGIN;

ALTER TABLE public.units
    ADD COLUMN IF NOT EXISTS map_x integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS map_y integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS map_floor integer DEFAULT 1;

UPDATE public.units
SET
    map_x = grid_x,
    map_y = grid_y,
    map_floor = 1
WHERE map_x IS NULL OR map_y IS NULL OR map_floor IS NULL;

CREATE TABLE IF NOT EXISTS public.unit_map_tiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL,
    floor integer NOT NULL DEFAULT 1,
    grid_x integer NOT NULL,
    grid_y integer NOT NULL,
    tile_type text NOT NULL DEFAULT 'corridor'::text CHECK (tile_type = ANY (ARRAY['corridor'::text])),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unit_map_tiles_pkey PRIMARY KEY (id),
    CONSTRAINT unit_map_tiles_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
    CONSTRAINT unit_map_tiles_unique UNIQUE (property_id, floor, grid_x, grid_y, tile_type)
);

ALTER TABLE public.unit_map_tiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Landlords can manage unit map tiles" ON public.unit_map_tiles;
CREATE POLICY "Landlords can manage unit map tiles" ON public.unit_map_tiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM public.properties p
            WHERE p.id = unit_map_tiles.property_id
              AND p.landlord_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.properties p
            WHERE p.id = unit_map_tiles.property_id
              AND p.landlord_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Tenants can view unit map tiles" ON public.unit_map_tiles;
CREATE POLICY "Tenants can view unit map tiles" ON public.unit_map_tiles
    FOR SELECT
    USING (
        public.current_tenant_property_id() IS NOT NULL
        AND public.current_tenant_property_id() = unit_map_tiles.property_id
    );

DROP POLICY IF EXISTS "Public unit map tiles read access" ON public.unit_map_tiles;
CREATE POLICY "Public unit map tiles read access" ON public.unit_map_tiles
    FOR SELECT
    USING (true);

COMMIT;
