-- ========================================
-- MULTI-DEVICE MONITORING SETUP
-- ========================================
-- This migration creates RPC functions to monitor users with multiple active devices

-- ========================================
-- RPC FUNCTION: GET MULTI-DEVICE LOGINS
-- ========================================

-- Drop function if exists
DROP FUNCTION IF EXISTS public.get_multi_device_logins(integer);

-- Create function to get users with multiple active devices
CREATE OR REPLACE FUNCTION public.get_multi_device_logins(
  min_device_count integer DEFAULT 2
)
RETURNS TABLE (
  user_id uuid,
  email text,
  device_count bigint,
  devices jsonb,
  is_active boolean,
  last_login timestamp with time zone
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
    WHERE admin_roles.user_id = auth.uid()
    AND admin_roles.is_active = true
  ) THEN
    RAISE EXCEPTION 'Only admins can view multi-device logins';
  END IF;

  -- Return users with multiple active sessions/devices
  -- Note: This assumes we are tracking active sessions in a way that allows us to count them
  -- Since the user schema provided has 'active_device_hash' and 'active_session_id', 
  -- but those are single fields, we need to rely on the 'devices' table or 'login_attempts' 
  -- or 'subscriptions' to find concurrency.
  -- 
  -- However, typically concurrent sessions are tracked in a 'sessions' table or by querying
  -- recent activity across devices. 
  --
  -- Given the schema provided earlier:
  -- "devices" table maps device_hash to usage.
  -- "users" table has active_device_hash (singular).
  --
  -- To support multi-device monitoring properly, we usually need to look at recent activity
  -- in the 'devices' table for a specific user (via last_user_id) within a certain timeframe.
  
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    COUNT(d.id) as device_count,
    jsonb_agg(
      jsonb_build_object(
        'device_hash', d.device_hash,
        'last_active', d.last_seen,
        'session_id', NULL -- We don't have session_id in devices table, but that's okay
      )
    ) as devices,
    u.is_active,
    u.last_login
  FROM public.users u
  JOIN public.devices d ON d.last_user_id = u.id
  WHERE 
    d.last_seen > (NOW() - INTERVAL '24 hours') -- Consider active in last 24h
    AND d.is_blocked = false
  GROUP BY u.id, u.email, u.is_active, u.last_login
  HAVING COUNT(d.id) >= min_device_count
  ORDER BY device_count DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_multi_device_logins(integer) TO authenticated;

-- ========================================
-- RPC FUNCTION: GET USER SESSIONS
-- ========================================

DROP FUNCTION IF EXISTS public.get_user_sessions(uuid);

CREATE OR REPLACE FUNCTION public.get_user_sessions(
  target_user_id uuid
)
RETURNS TABLE (
  user_id uuid,
  email text,
  device_hash text,
  session_id text,
  last_active timestamp with time zone,
  is_current boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE admin_roles.user_id = auth.uid()
    AND admin_roles.is_active = true
  ) THEN
    RAISE EXCEPTION 'Only admins can view user sessions';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    d.device_hash,
    CASE 
      WHEN u.active_device_hash = d.device_hash THEN u.active_session_id 
      ELSE NULL 
    END as session_id,
    d.last_seen as last_active,
    (u.active_device_hash = d.device_hash) as is_current
  FROM public.users u
  JOIN public.devices d ON d.last_user_id = u.id
  WHERE u.id = target_user_id
  ORDER BY d.last_seen DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_sessions(uuid) TO authenticated;

-- ========================================
-- RPC FUNCTION: TERMINATE SESSION (BLOCK DEVICE)
-- ========================================

DROP FUNCTION IF EXISTS public.terminate_user_session(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.terminate_user_session(
  target_user_id uuid,
  target_device_hash text,
  admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only admins can terminate sessions';
  END IF;

  -- Block the device
  UPDATE public.devices
  SET 
    is_blocked = true,
    blocked_reason = 'Terminated by admin for suspicious activity',
    updated_at = NOW()
  WHERE device_hash = target_device_hash;

  -- If this was the active device, clear it from user record
  UPDATE public.users
  SET 
    active_device_hash = NULL,
    active_session_id = NULL,
    updated_at = NOW()
  WHERE id = target_user_id AND active_device_hash = target_device_hash;

  -- Log action
  INSERT INTO public.audit_logs (
    user_id,
    action,
    details,
    admin_id
  ) VALUES (
    target_user_id,
    'terminate_session',
    jsonb_build_object(
      'device_hash', target_device_hash,
      'reason', 'Multi-device concurrency'
    ),
    auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.terminate_user_session(uuid, text, uuid) TO authenticated;

-- ========================================
-- TEST DATA (Optional)
-- ========================================
/*
-- Insert a test user if needed, or update existing devices to match a user
-- (Assuming user IDs exist)
*/
