-- ==============================================================================
-- FIX: DISPLAY "INVALID DATE" AND FIX "SET STATUS" FOR USERS WITHOUT PLANS
-- ==============================================================================

-- 1. DROP the existing function to change return signature
DROP FUNCTION IF EXISTS public.get_users_with_subscriptions();

-- 2. RECREATE get_users_with_subscriptions with MISSING COLUMNS
--    Added: subscription_ends_at, created_at
CREATE OR REPLACE FUNCTION public.get_users_with_subscriptions()
RETURNS TABLE (
  user_id uuid,
  email character varying,
  plan_id text,
  plan_name text,
  status text,
  trial_ends_at timestamp with time zone,
  subscription_ends_at timestamp with time zone, -- Fixed: Was missing
  created_at timestamp with time zone,           -- Fixed: Was missing
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
    u.id as user_id,
    u.email,
    s.plan_id,
    p.name as plan_name,
    COALESCE(s.status, 'no_plan') as status,
    s.trial_ends_at,
    s.subscription_ends_at,       -- distinct for paid plans
    u.created_at,                 -- needed for "Start Date" column
    s.device_hash,
    COALESCE(d.trial_count, 0) as trial_count
  FROM auth.users u
  LEFT JOIN public.subscriptions s ON u.id = s.user_id
  LEFT JOIN public.plans p ON s.plan_id = p.id
  LEFT JOIN public.devices d ON s.device_hash = d.device_hash
  ORDER BY u.created_at DESC;
END;
$$;


-- 3. CREATE/UPDATE admin_set_user_status_secure
--    This handles the "Admin Set Status" dialog.
--    Crucially, it now CREATES a subscription if one is missing (fixing the "no_plan" issue).
CREATE OR REPLACE FUNCTION public.admin_set_user_status_secure(
  target_user_id uuid,
  new_status text,
  justification text,
  admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role_val text;
  existing_sub_id uuid;
  new_plan_id text;
  new_trial_end timestamp with time zone;
  new_sub_end timestamp with time zone;
BEGIN
  -- A. Verify Admin Permissions
  -- (We assume get_admin_role exists, otherwise we check admin_roles table directly)
  SELECT role INTO admin_role_val FROM public.admin_roles WHERE user_id = admin_id AND is_active = true;
  
  IF admin_role_val != 'SuperAdmin' THEN
    RAISE EXCEPTION 'Only SuperAdmins can manually set user status';
  END IF;

  IF justification IS NULL OR trim(justification) = '' THEN
    RAISE EXCEPTION 'Justification is required';
  END IF;

  -- B. Determine Plan & Dates based on Status
  new_trial_end := NULL;
  new_sub_end := NULL;
  new_plan_id := 'base'; -- Default to base plan if we are activating

  IF new_status = 'trialing' THEN
    new_trial_end := now() + interval '30 days';
  ELSIF new_status = 'active' THEN
    new_sub_end := now() + interval '1 month';
    -- Assume 'Standard Plan' or 'Base' for manual activation? Let's use 'base' to be safe.
    -- Or keep existing plan if exists.
  END IF;

  -- C. Check if subscription exists
  SELECT id INTO existing_sub_id FROM public.subscriptions WHERE user_id = target_user_id;

  IF existing_sub_id IS NOT NULL THEN
    -- UPDATE EXISTING
    UPDATE public.subscriptions
    SET 
      status = new_status,
      -- Only update dates if switching to that mode, otherwise keep valid dates or nullify?
      -- Logic: If Admin sets 'Active', we give them time. If 'Expired', we assume dates are past.
      trial_ends_at = CASE WHEN new_status = 'trialing' THEN new_trial_end ELSE trial_ends_at END,
      subscription_ends_at = CASE WHEN new_status = 'active' THEN new_sub_end ELSE subscription_ends_at END,
      updated_at = now()
    WHERE id = existing_sub_id;
  ELSE
    -- INSERT NEW (Fixes "No Plan" users)
    INSERT INTO public.subscriptions (
      user_id, 
      status, 
      plan_id, 
      trial_ends_at, 
      subscription_ends_at
    )
    VALUES (
      target_user_id,
      new_status,
      new_plan_id,
      new_trial_end,
      new_sub_end
    );
  END IF;

  -- D. Audit Log
  INSERT INTO public.audit_logs (user_id, admin_id, action, details)
  VALUES (
    target_user_id,
    admin_id,
    'ADMIN_SET_STATUS',
    jsonb_build_object(
      'new_status', new_status,
      'justification', justification,
      'created_subscription', (existing_sub_id IS NULL)
    )
  );

  RETURN json_build_object('success', true);
END;
$$;
