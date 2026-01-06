-- ==============================================================================
-- FIX: CONNECT TRIAL SETTINGS TO SIGNUP LOGIC (IMPROVED & ROBUST)
-- ==============================================================================

-- 1. Fix get_users_with_subscriptions to show users even if they have no subscription
--    This ensures you can see "failed" signups or users without plans in your Admin Panel.
--    NOTE: We explicitly DROP the function first to allow changing its return signature.
DROP FUNCTION IF EXISTS public.get_users_with_subscriptions();

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
    u.id as user_id,
    u.email,
    s.plan_id,
    p.name as plan_name,
    COALESCE(s.status, 'no_plan') as status,
    s.trial_ends_at,
    s.device_hash,
    COALESCE(d.trial_count, 0) as trial_count
  FROM auth.users u
  LEFT JOIN public.subscriptions s ON u.id = s.user_id
  LEFT JOIN public.plans p ON s.plan_id = p.id
  LEFT JOIN public.devices d ON s.device_hash = d.device_hash
  ORDER BY u.created_at DESC;
END;
$$;


-- 2. Update the Signup Trigger to READ your settings
--    Previously, this function ignored your 'Trial Settings' page and used hardcoded values.
--    Now, it fetches 'free_trial_days' from the database before creating the subscription.
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  available_sender RECORD;
  user_device_hash text;
  device_trial_count int;
  
  -- Variables for settings
  config_trial_days int;
  config_auto_create boolean;
  trial_days_str text;
  auto_create_str text;
  trial_duration_interval interval;
BEGIN
  -- ===================================================
  -- 2.1 FETCH SETTINGS FROM YOUR CONFIGURATION
  -- ===================================================
  SELECT value INTO trial_days_str FROM public.app_config WHERE key = 'free_trial_days';
  SELECT value INTO auto_create_str FROM public.app_config WHERE key = 'auto_create_trial';

  -- Safely parse trial days (default to 7 if missing or invalid)
  IF trial_days_str ~ '^[0-9]+$' THEN
    config_trial_days := trial_days_str::int;
  ELSE
    config_trial_days := 7;
  END IF;

  -- Safely parse auto-create (default to true)
  IF LOWER(auto_create_str) = 'false' THEN
    config_auto_create := false;
  ELSE
    config_auto_create := true;
  END IF;

  -- ===================================================
  -- 2.2 HANDLE DEVICE HASH (Prevents crash if missing)
  -- ===================================================
  user_device_hash := NEW.raw_user_meta_data->>'device_hash';
  IF user_device_hash IS NULL THEN
    -- Fallback for web signups or missing hash
    user_device_hash := 'web_' || NEW.id; 
  END IF;

  -- ===================================================
  -- 2.3 CHECK DEVICE LIMITS (Only for real devices)
  -- ===================================================
  IF user_device_hash NOT LIKE 'web_%' THEN
      SELECT trial_count INTO device_trial_count
      FROM public.devices
      WHERE device_hash = user_device_hash;

      IF device_trial_count IS NULL THEN
        INSERT INTO public.devices (device_hash, trial_count, last_user_id, last_seen)
        VALUES (user_device_hash, 0, NEW.id, now());
        device_trial_count := 0;
      END IF;
      
      IF device_trial_count >= 5 THEN
        INSERT INTO public.audit_logs (device_hash, action, details)
        VALUES (user_device_hash, 'TRIAL_LIMIT_REACHED', jsonb_build_object('email', NEW.email));
        -- Note: We raise exception here only for real devices abusing the system
        RAISE EXCEPTION 'Trial limit reached for this device (maximum 5 trials). Contact support.';
      END IF;
  END IF;

  -- ===================================================
  -- 2.4 ASSIGN EMAIL SENDER
  -- ===================================================
  SELECT * FROM public.sender_pool
  WHERE assigned_count < max_users AND is_active = true
  ORDER BY assigned_count ASC
  LIMIT 1
  INTO available_sender;
  
  IF available_sender IS NOT NULL THEN
    INSERT INTO public.sender_assignments(user_id, sender_id)
    VALUES (NEW.id, available_sender.id);
    
    UPDATE public.sender_pool
    SET assigned_count = assigned_count + 1
    WHERE id = available_sender.id;
  END IF;
  -- Note: We continue even if no sender is found, to ensure the user is created.

  -- ===================================================
  -- 2.5 UPDATE DEVICE STATS
  -- ===================================================
  IF user_device_hash NOT LIKE 'web_%' THEN
      INSERT INTO public.devices (device_hash, trial_count, last_user_id, last_seen)
      VALUES (user_device_hash, 1, NEW.id, now())
      ON CONFLICT (device_hash) DO UPDATE 
      SET 
        trial_count = public.devices.trial_count + 1,
        last_user_id = NEW.id,
        last_seen = now();
  END IF;

  -- ===================================================
  -- 2.6 CREATE SUBSCRIPTION (RESPECTING SETTINGS)
  -- ===================================================
  IF config_auto_create THEN
      trial_duration_interval := (config_trial_days || ' days')::interval;

      INSERT INTO public.subscriptions(user_id, plan_id, status, trial_ends_at, device_hash)
      VALUES (
        NEW.id, 
        'base', 
        'trialing', 
        now() + trial_duration_interval, 
        user_device_hash
      );

      INSERT INTO public.audit_logs (user_id, device_hash, action, details)
      VALUES (NEW.id, user_device_hash, 'TRIAL_ACTIVATED', jsonb_build_object('days_given', config_trial_days));
  END IF;

  RETURN NEW;
END;
$$;
