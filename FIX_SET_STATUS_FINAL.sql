-- ==============================================================================
-- FINAL FIX FOR "SET STATUS" NOT WORKING
-- ==============================================================================

DROP FUNCTION IF EXISTS public.admin_set_user_status_secure(uuid, text, text, uuid);

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
  found_device_hash text;
  new_plan_id text;
  new_trial_end timestamp with time zone;
  new_sub_end timestamp with time zone;
BEGIN
  -- 1. SECURE ADMIN CHECK using the safe function
  admin_role_val := public.get_admin_role(admin_id);
  
  IF admin_role_val IS NULL OR admin_role_val != 'SuperAdmin' THEN
    RAISE EXCEPTION 'Only SuperAdmins can manually set user status';
  END IF;

  IF justification IS NULL OR trim(justification) = '' THEN
    RAISE EXCEPTION 'Justification is required';
  END IF;

  -- 2. DETERMINE DATES
  new_plan_id := 'base'; 
  IF new_status = 'trialing' THEN
    new_trial_end := now() + interval '30 days';
  ELSIF new_status = 'active' THEN
    new_sub_end := now() + interval '1 month';
  END IF;

  -- 3. CHECK FOR EXISTING DEVICE (To link if possible)
  SELECT device_hash INTO found_device_hash
  FROM public.devices
  WHERE last_user_id = target_user_id
  ORDER BY last_seen DESC
  LIMIT 1;

  -- 4. INSERT OR UPDATE
  SELECT id INTO existing_sub_id FROM public.subscriptions WHERE user_id = target_user_id;

  IF existing_sub_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET 
      status = new_status,
      trial_ends_at = CASE WHEN new_status = 'trialing' THEN new_trial_end ELSE trial_ends_at END,
      subscription_ends_at = CASE WHEN new_status = 'active' THEN new_sub_end ELSE subscription_ends_at END,
      updated_at = now()
    WHERE id = existing_sub_id;
  ELSE
    -- INSERT NEW (Fix for "No Plan" users)
    INSERT INTO public.subscriptions (
      user_id, 
      status, 
      plan_id, 
      trial_ends_at, 
      subscription_ends_at,
      device_hash -- Try to link device if we found one
    )
    VALUES (
      target_user_id,
      new_status,
      new_plan_id,
      new_trial_end,
      new_sub_end,
      found_device_hash
    );
  END IF;

  -- 5. AUDIT LOG
  INSERT INTO public.audit_logs (user_id, admin_id, action, details)
  VALUES (
    target_user_id,
    admin_id,
    'ADMIN_SET_STATUS',
    jsonb_build_object(
      'new_status', new_status,
      'justification', justification,
      'was_created', (existing_sub_id IS NULL)
    )
  );

  RETURN json_build_object('success', true);
END;
$$;
