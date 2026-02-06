-- Relax profile RLS to allow users to see each other's names/avatars
BEGIN;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

-- Allow any authenticated user to view profiles (needed for chat, tenant lists, etc.)
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

COMMIT;
