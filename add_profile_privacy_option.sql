-- Add profile privacy option for unit map name visibility
BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_name_private BOOLEAN DEFAULT FALSE;

COMMIT;
