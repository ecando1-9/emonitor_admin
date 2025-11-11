-- ===================================================
-- EMERGENCY PATCH: Fix Type Mismatch in get_users_with_subscriptions
-- Date: 2025-11-12
-- Issue: "Returned type character varying(255) does not match expected type text in column 2"
-- ===================================================

-- Drop the broken function
DROP FUNCTION IF EXISTS public.get_users_with_subscriptions() CASCADE;

-- Recreate with correct email type
CREATE OR REPLACE FUNCTION public.get_users_with_subscriptions()
RETURNS TABLE (
  user_id uuid,
  email character varying,
  plan_id text,
  plan_name text,
  status text,
  trial_ends_at timestamp with time zone,
  device_hash text,
  trial_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Insufficient permissions: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    s.user_id,
    u.email,
    s.plan_id,
    p.name,
    s.status,
    s.trial_ends_at,
    s.device_hash,
    d.trial_count
  FROM public.subscriptions s
  JOIN auth.users u ON s.user_id = u.id
  LEFT JOIN public.plans p ON s.plan_id = p.id
  LEFT JOIN public.devices d ON s.device_hash = d.device_hash
  ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_with_subscriptions() TO authenticated;

-- ===================================================
-- Fix Type Mismatch in get_active_devices
-- Issue: Column 4 (last_user_email) returns character varying(255) instead of text
-- ===================================================

DROP FUNCTION IF EXISTS public.get_active_devices() CASCADE;

CREATE OR REPLACE FUNCTION public.get_active_devices()
RETURNS TABLE (
  device_hash text,
  trial_count int,
  last_user_id uuid,
  last_user_email character varying,
  is_blocked boolean,
  last_seen timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Insufficient permissions: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    d.device_hash,
    d.trial_count,
    d.last_user_id,
    u.email,
    d.is_blocked,
    d.last_seen
  FROM public.devices d
  LEFT JOIN auth.users u ON d.last_user_id = u.id
  WHERE d.is_blocked = false
  ORDER BY d.last_seen DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_devices() TO authenticated;
