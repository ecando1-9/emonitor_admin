-- ==============================================================================
-- FINAL FIX: ELIMINATE RECURSION BY SIMPLIFYING POLICIES
-- ==============================================================================

-- 1. DROP ALL EXISTING POLICIES ON ADMIN_ROLES
--    We are removing the complex logic that causes the loop.
DROP POLICY IF EXISTS "Admins can view admin_roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can manage admin_roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.admin_roles;
DROP POLICY IF EXISTS "super_admin_all" ON public.admin_roles;
DROP POLICY IF EXISTS "SuperAdmins can manage admin_roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.admin_roles;

-- 2. CREATE A "SAFE" POLICY (NO RECURSION)
--    This allows users to ONLY see their own role.
--    This breaks the loop because checking this policy does not require checking if you are an admin.
CREATE POLICY "Users can read own role"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. ENSURE IS_ADMIN FUNCTION IS SECURE
--    It must be SECURITY DEFINER to bypass the policy above and see "all" roles internally.
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This runs as Superuser, so it bypasses the "Users can read own role" policy
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = user_uuid 
    AND is_active = true
  );
END;
$$;

-- 4. CREATE SECURE RPC TO VIEW ALL ROLES (For Admin Page)
--    Since we restricted the table view to "own only", we need this function
--    to let SuperAdmins see the list of all admins.
CREATE OR REPLACE FUNCTION public.get_all_admin_roles_secure()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email character varying,
  role text,
  is_active boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Check permission using the safe is_admin function
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT 
    ar.id,
    ar.user_id,
    u.email,
    ar.role,
    ar.is_active,
    ar.created_at
  FROM public.admin_roles ar
  JOIN auth.users u ON ar.user_id = u.id
  ORDER BY ar.created_at DESC;
END;
$$;
