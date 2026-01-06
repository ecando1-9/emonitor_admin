-- ========================================
-- FIX LOGIN HISTORY PERMISSIONS
-- ========================================

-- We will use a Secure RPC function to fetch login history
-- This avoids "permission denied" errors from RLS policies

DROP FUNCTION IF EXISTS public.get_login_history_secure(text);

CREATE OR REPLACE FUNCTION public.get_login_history_secure(
  target_email text
)
RETURNS SETOF public.login_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin access
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can view login history';
  END IF;

  -- Return login attempts
  RETURN QUERY
  SELECT * FROM public.login_attempts
  WHERE email = target_email
  ORDER BY attempt_time DESC
  LIMIT 100;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_login_history_secure(text) TO authenticated;
