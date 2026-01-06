-- ========================================
-- TRIAL SETTINGS CONFIGURATION
-- ========================================
-- This migration sets up the app_config table with trial settings
-- and creates secure RPC functions for admin access

-- Insert default trial settings if they don't exist
INSERT INTO public.app_config (key, value, description, updated_at)
VALUES 
  ('free_trial_days', '7', 'Number of days for free trial', NOW()),
  ('auto_create_trial', 'true', 'Automatically create trial on signup', NOW())
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- RLS POLICIES FOR APP_CONFIG
-- ========================================

-- Enable RLS on app_config table
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read app_config" ON public.app_config;
DROP POLICY IF EXISTS "SuperAdmins can update app_config" ON public.app_config;

-- Allow admins to read app_config
CREATE POLICY "Admins can read app_config"
ON public.app_config
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE admin_roles.user_id = auth.uid()
    AND admin_roles.is_active = true
  )
);

-- No direct UPDATE policy - updates must go through RPC function

-- ========================================
-- SECURE RPC FUNCTION FOR UPDATING APP CONFIG
-- ========================================

-- Drop function if exists
DROP FUNCTION IF EXISTS public.update_app_config_secure(text, text, uuid);

-- Create secure function to update app_config
CREATE OR REPLACE FUNCTION public.update_app_config_secure(
  config_key text,
  config_value text,
  admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role_val text;
  result_row json;
BEGIN
  -- Check if caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller matches admin_id
  IF auth.uid() != admin_id THEN
    RAISE EXCEPTION 'Admin ID mismatch';
  END IF;

  -- Get admin role
  SELECT role INTO admin_role_val
  FROM public.admin_roles
  WHERE user_id = admin_id
    AND is_active = true;

  -- Check if user is SuperAdmin
  IF admin_role_val IS NULL THEN
    RAISE EXCEPTION 'User is not an admin';
  END IF;

  IF admin_role_val != 'SuperAdmin' THEN
    RAISE EXCEPTION 'Only SuperAdmins can update app configuration';
  END IF;

  -- Update the config
  UPDATE public.app_config
  SET 
    value = config_value,
    updated_at = NOW(),
    updated_by = admin_id
  WHERE key = config_key;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configuration key "%" not found', config_key;
  END IF;

  -- Log the action
  INSERT INTO public.audit_logs (admin_id, action, details)
  VALUES (
    admin_id,
    'update_app_config',
    jsonb_build_object(
      'key', config_key,
      'new_value', config_value,
      'timestamp', NOW()
    )
  );

  -- Return the updated row
  SELECT json_build_object(
    'key', key,
    'value', value,
    'description', description,
    'updated_at', updated_at,
    'updated_by', updated_by
  ) INTO result_row
  FROM public.app_config
  WHERE key = config_key;

  RETURN result_row;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_app_config_secure(text, text, uuid) TO authenticated;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these to verify the setup:

-- Check if settings exist
-- SELECT * FROM public.app_config WHERE key IN ('free_trial_days', 'auto_create_trial');

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'app_config';

-- Check if function exists
-- SELECT routine_name, routine_type FROM information_schema.routines 
-- WHERE routine_schema = 'public' AND routine_name = 'update_app_config_secure';

-- Test the function (replace with your admin UUID)
-- SELECT public.update_app_config_secure('free_trial_days', '14', 'your-admin-uuid-here');
