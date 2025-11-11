-- ===================================================
-- ADD UPGRADE PLAN RPC FUNCTION
-- Date: 2025-11-12
-- ===================================================

-- Upgrade user plan (admin only)
CREATE OR REPLACE FUNCTION public.upgrade_plan_secure(
  target_user_id uuid,
  new_plan_id text,
  justification text DEFAULT 'Admin plan upgrade',
  admin_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  admin_role text;
  old_plan_id text;
  plan_name text;
BEGIN
  -- Get the admin ID if not provided
  IF admin_id IS NULL THEN
    admin_id := auth.uid();
  END IF;

  -- Check if user is admin
  admin_role := public.get_admin_role(admin_id);
  
  IF admin_role NOT IN ('SuperAdmin', 'SupportAdmin') THEN
    RAISE EXCEPTION 'Unauthorized: Only SuperAdmin and SupportAdmin can upgrade plans';
  END IF;

  -- Get old plan
  SELECT plan_id INTO old_plan_id
  FROM public.subscriptions
  WHERE user_id = target_user_id;

  IF old_plan_id IS NULL THEN
    RAISE EXCEPTION 'No subscription found for user';
  END IF;

  -- Get new plan name
  SELECT name INTO plan_name
  FROM public.plans
  WHERE id = new_plan_id;

  IF plan_name IS NULL THEN
    RAISE EXCEPTION 'Plan not found: %', new_plan_id;
  END IF;

  -- Update subscription
  UPDATE public.subscriptions
  SET plan_id = new_plan_id,
      status = CASE 
        WHEN status = 'trialing' THEN 'trialing'
        ELSE 'active'
      END,
      updated_at = now()
  WHERE user_id = target_user_id;

  -- Log the action
  INSERT INTO public.audit_logs (user_id, action, details, admin_id)
  VALUES (
    target_user_id,
    'PLAN_UPGRADED',
    jsonb_build_object(
      'old_plan', old_plan_id,
      'new_plan', new_plan_id,
      'plan_name', plan_name,
      'justification', justification,
      'admin_role', admin_role
    ),
    admin_id
  );

  RETURN json_build_object(
    'success', true,
    'user_id', target_user_id,
    'new_plan', new_plan_id,
    'plan_name', plan_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upgrade_plan_secure(uuid, text, text, uuid) TO authenticated;
