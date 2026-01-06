-- 1. FIX THE COUNTS ("Why it is showing 84?")
-- This query forces a recalculation of all assigned_counts based on the actual assignments table.
-- This cleans up any "phantom" counts from deleted users.
UPDATE public.sender_pool sp
SET assigned_count = (
    SELECT count(*)
    FROM public.sender_assignments sa
    WHERE sa.sender_id = sp.id
);

-- 2. PREVENT FUTURE DRIFT
-- Create a trigger to automatically decrement the count when a user (and their assignment) is deleted.
CREATE OR REPLACE FUNCTION public.maintain_pool_counts_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.sender_pool
    SET assigned_count = assigned_count - 1
    WHERE id = OLD.sender_id;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_assignment_deleted ON public.sender_assignments;
CREATE TRIGGER on_assignment_deleted
    AFTER DELETE ON public.sender_assignments
    FOR EACH ROW
    EXECUTE PROCEDURE public.maintain_pool_counts_on_delete();

-- 3. ENSURE "LEAST ASSIGNED" LOGIC
-- We redefine the user setup function to explicitly verify the ORDER BY logic.
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
BEGIN
  -- Get device hash
  user_device_hash := NEW.raw_user_meta_data->>'device_hash';
  IF user_device_hash IS NULL THEN
    RAISE EXCEPTION 'Device hash is missing from user metadata.';
  END IF;

  -- Logic for device trials
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
    RAISE EXCEPTION 'Trial limit reached for this device (maximum 5 trials). Contact support.';
  END IF;

  -- === LOGIC START: LEAST ASSIGNED EMAIL ===
  -- Select active sender with lowest assigned_count
  SELECT * FROM public.sender_pool
  WHERE assigned_count < max_users AND is_active = true
  ORDER BY assigned_count ASC, id ASC
  LIMIT 1
  INTO available_sender;
  -- === LOGIC END ===

  IF available_sender IS NULL THEN
    RAISE EXCEPTION 'CRITICAL: No available sender emails in the pool.';
  END IF;

  -- Create assignment
  INSERT INTO public.sender_assignments(user_id, sender_id)
  VALUES (NEW.id, available_sender.id);
  
  -- Manually increment count (Trigger handles DELETE only)
  UPDATE public.sender_pool
  SET assigned_count = assigned_count + 1
  WHERE id = available_sender.id;

  -- Continue with setup...
  INSERT INTO public.devices (device_hash, trial_count, last_user_id, last_seen)
  VALUES (user_device_hash, 1, NEW.id, now())
  ON CONFLICT (device_hash) DO UPDATE 
  SET 
    trial_count = public.devices.trial_count + 1,
    last_user_id = NEW.id,
    last_seen = now();

  INSERT INTO public.subscriptions(user_id, plan_id, status, trial_ends_at, device_hash)
  VALUES (NEW.id, 'base', 'trialing', now() + interval '30 days', user_device_hash);

  INSERT INTO public.audit_logs (user_id, device_hash, action)
  VALUES (NEW.id, user_device_hash, 'TRIAL_ACTIVATED');

  RETURN NEW;
END;
$$;
