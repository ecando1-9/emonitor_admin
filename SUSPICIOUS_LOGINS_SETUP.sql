-- ========================================
-- SUSPICIOUS LOGIN MONITORING SETUP
-- ========================================
-- This migration creates RPC functions to monitor suspicious login activity

-- ========================================
-- RLS POLICIES FOR LOGIN_ATTEMPTS
-- ========================================

-- Enable RLS on login_attempts table
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read login_attempts" ON public.login_attempts;

-- Allow admins to read login_attempts
CREATE POLICY "Admins can read login_attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE admin_roles.user_id = auth.uid()
    AND admin_roles.is_active = true
  )
);

-- ========================================
-- RPC FUNCTION: GET SUSPICIOUS LOGINS
-- ========================================

-- Drop function if exists
DROP FUNCTION IF EXISTS public.get_suspicious_logins(integer);

-- Create function to get accounts with multiple failed login attempts
CREATE OR REPLACE FUNCTION public.get_suspicious_logins(
  min_failed_attempts integer DEFAULT 5
)
RETURNS TABLE (
  email text,
  failed_attempts bigint,
  last_attempt timestamp with time zone,
  ip_addresses text[],
  device_hashes text[],
  is_blocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only admins can view suspicious logins';
  END IF;

  -- Return suspicious accounts
  RETURN QUERY
  SELECT 
    la.email,
    COUNT(*) FILTER (WHERE la.success = false) as failed_attempts,
    MAX(la.attempt_time) as last_attempt,
    ARRAY_AGG(DISTINCT la.ip_address) FILTER (WHERE la.ip_address IS NOT NULL) as ip_addresses,
    ARRAY_AGG(DISTINCT la.device_hash) FILTER (WHERE la.device_hash IS NOT NULL) as device_hashes,
    EXISTS (
      SELECT 1 FROM public.blocked_ips bi
      WHERE bi.ip_address = ANY(ARRAY_AGG(DISTINCT la.ip_address))
    ) as is_blocked
  FROM public.login_attempts la
  GROUP BY la.email
  HAVING COUNT(*) FILTER (WHERE la.success = false) >= min_failed_attempts
  ORDER BY failed_attempts DESC, last_attempt DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_suspicious_logins(integer) TO authenticated;

-- ========================================
-- HELPER FUNCTION: LOG LOGIN ATTEMPT
-- ========================================

-- Drop function if exists
DROP FUNCTION IF EXISTS public.log_login_attempt(text, text, boolean, text);

-- Create function to log login attempts (for desktop app integration)
CREATE OR REPLACE FUNCTION public.log_login_attempt(
  p_email text,
  p_device_hash text DEFAULT NULL,
  p_success boolean DEFAULT false,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_id uuid;
BEGIN
  -- Insert login attempt
  INSERT INTO public.login_attempts (
    email,
    device_hash,
    success,
    ip_address,
    attempt_time
  )
  VALUES (
    p_email,
    p_device_hash,
    p_success,
    p_ip_address,
    NOW()
  )
  RETURNING id INTO attempt_id;

  RETURN attempt_id;
END;
$$;

-- Grant execute permission to anon and authenticated users (for login flow)
GRANT EXECUTE ON FUNCTION public.log_login_attempt(text, text, boolean, text) TO anon, authenticated;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these to verify the setup:

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'login_attempts';

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'login_attempts';

-- Check if functions exist
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN ('get_suspicious_logins', 'log_login_attempt');

-- Test the function (will return empty if no suspicious logins)
-- SELECT * FROM public.get_suspicious_logins(5);

-- ========================================
-- SAMPLE DATA (Optional - for testing)
-- ========================================
-- Uncomment to create test data:

/*
-- Create some test login attempts
INSERT INTO public.login_attempts (email, device_hash, success, ip_address)
VALUES 
  ('test@example.com', 'device123', false, '192.168.1.100'),
  ('test@example.com', 'device123', false, '192.168.1.100'),
  ('test@example.com', 'device123', false, '192.168.1.100'),
  ('test@example.com', 'device123', false, '192.168.1.100'),
  ('test@example.com', 'device123', false, '192.168.1.100'),
  ('test@example.com', 'device123', false, '192.168.1.100'),
  ('test@example.com', 'device123', true, '192.168.1.100'),
  ('hacker@evil.com', 'device456', false, '10.0.0.1'),
  ('hacker@evil.com', 'device456', false, '10.0.0.1'),
  ('hacker@evil.com', 'device456', false, '10.0.0.1'),
  ('hacker@evil.com', 'device456', false, '10.0.0.1'),
  ('hacker@evil.com', 'device456', false, '10.0.0.1'),
  ('hacker@evil.com', 'device456', false, '10.0.0.1'),
  ('hacker@evil.com', 'device456', false, '10.0.0.1'),
  ('hacker@evil.com', 'device456', false, '10.0.0.1'),
  ('hacker@evil.com', 'device456', false, '10.0.0.1'),
  ('hacker@evil.com', 'device456', false, '10.0.0.1');

-- Test the function
SELECT * FROM public.get_suspicious_logins(5);
*/
