-- ==============================================================================
-- FIX: INFINITE RECURSION IN RLS POLICIES
-- ==============================================================================

-- 1. Re-declare is_admin as SECURITY DEFINER to strictly bypass RLS
--    This breaks the infinite loop where checking RLS requires checking RLS...
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 2. Update 'admin_roles' policy to be safe
--    Users can always see their own role. Admins can see all.
--    We drop all existing policies on admin_roles to start fresh and avoid conflicts.
DROP POLICY IF EXISTS "Admins can view admin_roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can manage admin_roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.admin_roles;

CREATE POLICY "Users can read own role"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR
  public.is_admin(auth.uid())
);

-- 3. Standardize other policies to use the safe is_admin() function
--    Replacing direct subqueries avoids accidental recursion triggers.

-- App Config (Trial Settings)
DROP POLICY IF EXISTS "Admins can read app_config" ON public.app_config;
CREATE POLICY "Admins can read app_config" ON public.app_config
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- Sender Assignments
DROP POLICY IF EXISTS "Admins can view sender_assignments" ON public.sender_assignments;
CREATE POLICY "Admins can view sender_assignments" ON public.sender_assignments
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- Sender Pool
DROP POLICY IF EXISTS "Admins can view sender_pool" ON public.sender_pool;
CREATE POLICY "Admins can view sender_pool" ON public.sender_pool
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));
