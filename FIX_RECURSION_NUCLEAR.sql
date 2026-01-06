-- ==============================================================================
-- NUCLEAR OPTION: FIX INFINITE RECURSION BY DROPPING ALL POLICIES
-- ==============================================================================

-- 1. DISABLE RLS TEMPORARILY
--    This immediately stops the recursion so we can fix the policies without crashing.
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;

-- 2. DROP *ALL* POLICIES ON admin_roles DYNAMICALLY
--    This ensures we don't miss any "hidden" or "renamed" policies causing the loop.
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'admin_roles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_roles', pol.policyname);
    END LOOP;
END $$;

-- 3. RE-ENABLE RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- 4. CREATE THE SINGLE, SAFE POLICY
--    Users can ONLY see their own role. No recursion possible.
CREATE POLICY "Users can read own role"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. SECURE CRITICAL FUNCTIONS
--    Ensure these run with "Security Definer" to bypass tables RLS completely.

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- <--- CRITICAL
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = user_uuid 
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_role(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- <--- CRITICAL
SET search_path = public
AS $$
DECLARE -- Fixed typo: DECLAR -> DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.admin_roles
  WHERE user_id = user_uuid AND is_active = true;
  RETURN user_role;
END;
$$;
