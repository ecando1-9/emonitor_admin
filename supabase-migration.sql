-- ===================================================
-- EMONITOR DATABASE MIGRATION
-- Complete schema + RPC functions for admin panel & app
-- Date: 2025-11-12
-- ===================================================

-- ===================================================
-- STEP 0: CLEAN SLATE (THE REAL FIX)
-- This drops all old, broken, and conflicting objects
-- by using CASCADE, as the error hint suggests.
-- ===================================================
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_setup() CASCADE;
DROP FUNCTION IF EXISTS public.check_device_limit(text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_signup(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.assign_sender_on_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.extend_trial_secure(uuid, int, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.block_device_secure(text, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.reset_device_trial_secure(text, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_stats_secure(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_security_alerts_secure(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.trigger_emergency_alert(text, jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.get_users_with_subscriptions() CASCADE;
DROP FUNCTION IF EXISTS public.get_active_devices() CASCADE;
DROP FUNCTION IF EXISTS public.get_audit_logs_secure(int) CASCADE;
DROP FUNCTION IF EXISTS public.unblock_device_secure(text, uuid) CASCADE;

DROP TABLE IF EXISTS public.admin_roles CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.blocked_ips CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;
DROP TABLE IF EXISTS public.sender_assignments CASCADE;
DROP TABLE IF EXISTS public.sender_pool CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.emergency_alerts CASCADE;

-- ========================================
-- STEP 1: Create all tables for Admin & App
-- ========================================

CREATE TABLE public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_hash text NOT NULL UNIQUE,
  trial_count integer DEFAULT 0,
  first_seen timestamp with time zone DEFAULT now(),
  last_seen timestamp with time zone DEFAULT now(),
  last_user_id uuid REFERENCES auth.users(id),
  is_blocked boolean DEFAULT false,
  blocked_reason text,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.plans (
  id text PRIMARY KEY, -- e.g., 'base', 'standard', 'premium'
  name text NOT NULL, -- e.g., 'Base Plan'
  price int NOT NULL, -- e.g., 99, 199, 299
  price_original int, 
  features text[] NOT NULL -- This will store ['TELEMETRY', 'SCREENSHOT', 'CAMERA'] etc.
);

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text REFERENCES public.plans(id),
  status text NOT NULL CHECK (status = ANY (ARRAY['trialing'::text, 'active'::text, 'expired'::text, 'cancelled'::text, 'suspended'::text])),
  trial_ends_at timestamp with time zone,
  subscription_ends_at timestamp with time zone,
  device_hash text REFERENCES public.devices(device_hash),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sender_pool (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  smtp_email text NOT NULL UNIQUE,
  smtp_server text NOT NULL,
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_password text NOT NULL,
  assigned_count integer DEFAULT 0,
  max_users integer DEFAULT 100,
  is_active boolean DEFAULT true,
  last_test timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sender_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.sender_pool(id),
  assigned_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.admin_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role = ANY (ARRAY['SuperAdmin'::text, 'SupportAdmin'::text, 'ReadOnly'::text])),
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  PRIMARY KEY (id)
);

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  device_hash text,
  action text NOT NULL,
  details jsonb,
  admin_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  promo_type text NOT NULL CHECK (promo_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'trial_days'::text])),
  discount_value numeric,
  trial_days integer,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  target_plans text[],
  display_text text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.blocked_ips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text NOT NULL,
  blocked_at timestamp with time zone DEFAULT now(),
  blocked_by uuid REFERENCES auth.users(id),
  expires_at timestamp with time zone,
  PRIMARY KEY (id)
);

CREATE TABLE public.emergency_alerts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  triggered_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  device_hash text REFERENCES public.devices(device_hash),
  last_location jsonb,
  activity_summary text,
  status text NOT NULL DEFAULT 'new',
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  notes text,
  -- User information
  user_phone text,
  user_email text,
  user_name text,
  device_name text,
  emergency_contacts jsonb DEFAULT '[]'::jsonb,
  -- Email tracking
  email_sent_to_user boolean DEFAULT false,
  email_sent_to_admin boolean DEFAULT false,
  email_sent_to_user_at timestamptz,
  email_sent_to_admin_at timestamptz,
  email_details jsonb DEFAULT '{}'::jsonb,
  -- Notification tracking
  users_notified_count integer DEFAULT 0,
  emergency_contacts_notified_count integer DEFAULT 0,
  emergency_contacts_notified jsonb DEFAULT '[]'::jsonb,
  admins_notified jsonb DEFAULT '[]'::jsonb
);

-- ========================================
-- STEP 2: INSERT YOUR PLANS
-- ========================================
INSERT INTO public.plans (id, name, price, features)
VALUES
  ('base', 'Base Plan', 99, 
    ARRAY['TELEMETRY', 'ACTIVITY_SUMMARY', 'SCREENSHOT', 'REPORT_SCHEDULE']
  ),
  ('standard', 'Standard Plan', 199, 
    ARRAY['TELEMETRY', 'ACTIVITY_SUMMARY', 'SCREENSHOT', 'REPORT_SCHEDULE', 
          'SCREEN_RECORD', 'ADVANCED_ACTIVITY', 'TYPING_INTENSITY']
  ),
  ('premium', 'Premium Plan', 299, 
    ARRAY['TELEMETRY', 'ACTIVITY_SUMMARY', 'SCREENSHOT', 'REPORT_SCHEDULE', 
          'SCREEN_RECORD', 'ADVANCED_ACTIVITY', 'TYPING_INTENSITY',
          'CAMERA', 'MICROPHONE', 'LOCATION', 'ALERTS']
  )
ON CONFLICT DO NOTHING;

-- ========================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = user_uuid AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_role(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.admin_roles
  WHERE user_id = user_uuid AND is_active = true;
  RETURN user_role;
END;
$$;

-- ===================================================
-- STEP 4: CREATE THE SIGNUP TRIGGER
-- This is the code that runs when a new user signs up
-- ===================================================

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
  user_device_hash := NEW.raw_user_meta_data->>'device_hash';
  IF user_device_hash IS NULL THEN
    RAISE EXCEPTION 'Device hash is missing from user metadata.';
  END IF;

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

  SELECT * FROM public.sender_pool
  WHERE assigned_count < max_users AND is_active = true
  ORDER BY assigned_count ASC
  LIMIT 1
  INTO available_sender;
  IF available_sender IS NULL THEN
    RAISE EXCEPTION 'CRITICAL: No available sender emails in the pool.';
  END IF;

  INSERT INTO public.sender_assignments(user_id, sender_id)
  VALUES (NEW.id, available_sender.id);
  
  UPDATE public.sender_pool
  SET assigned_count = assigned_count + 1
  WHERE id = available_sender.id;

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

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_setup();

-- ===================================================
-- STEP 5: ENABLE RLS AND SET ALL POLICIES
-- ===================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sender_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sender_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Policies for Admins
CREATE POLICY "Admins can view subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view devices" ON public.devices FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage devices" ON public.devices FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view sender_pool" ON public.sender_pool FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage sender_pool" ON public.sender_pool FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view sender_assignments" ON public.sender_assignments FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage sender_assignments" ON public.sender_assignments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view promotions" ON public.promotions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage promotions" ON public.promotions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view blocked_ips" ON public.blocked_ips FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage blocked_ips" ON public.blocked_ips FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view admin_roles" ON public.admin_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage admin_roles" ON public.admin_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view emergency_alerts" ON public.emergency_alerts FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage emergency_alerts" ON public.emergency_alerts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT TO authenticated USING (true);

-- Policies for Regular Users
CREATE POLICY "Users can read their own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own devices" ON public.devices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.subscriptions WHERE subscriptions.device_hash = devices.device_hash AND subscriptions.user_id = auth.uid()));

CREATE POLICY "Users can read their own sender assignment" ON public.sender_assignments FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create their own emergency alerts" ON public.emergency_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read their own emergency alerts" ON public.emergency_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===================================================
-- STEP 6: ADMIN RPC FUNCTIONS
-- ===================================================

-- Get all users with subscriptions (admin only)
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

-- Get active devices (admin only)
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

-- Extend trial for a user (admin only)
CREATE OR REPLACE FUNCTION public.extend_trial_secure(
  target_user_id uuid,
  days_to_add int,
  justification text,
  admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role text;
  old_trial_end timestamp with time zone;
  new_trial_end timestamp with time zone;
BEGIN
  admin_role := public.get_admin_role(admin_id);
  
  IF admin_role NOT IN ('SuperAdmin', 'SupportAdmin') THEN
    RAISE EXCEPTION 'Unauthorized: Only SuperAdmin and SupportAdmin can extend trials';
  END IF;

  IF justification IS NULL OR trim(justification) = '' THEN
    RAISE EXCEPTION 'Justification is required for trial extension';
  END IF;

  SELECT trial_ends_at INTO old_trial_end
  FROM public.subscriptions
  WHERE user_id = target_user_id;

  IF old_trial_end IS NULL THEN
    old_trial_end := now();
  END IF;

  new_trial_end := old_trial_end + (days_to_add || ' days')::interval;

  UPDATE public.subscriptions
  SET trial_ends_at = new_trial_end,
      status = 'trialing',
      updated_at = now()
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription found for user';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (
    target_user_id,
    'TRIAL_EXTENDED',
    jsonb_build_object(
      'days_added', days_to_add,
      'old_trial_end', old_trial_end,
      'new_trial_end', new_trial_end,
      'justification', justification,
      'admin_role', admin_role
    )
  );

  RETURN json_build_object(
    'success', true,
    'old_trial_end', old_trial_end,
    'new_trial_end', new_trial_end
  );
END;
$$;

-- Block a device (admin only)
CREATE OR REPLACE FUNCTION public.block_device_secure(
  target_device_hash text,
  justification text,
  admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role text;
BEGIN
  admin_role := public.get_admin_role(admin_id);
  
  IF admin_role NOT IN ('SuperAdmin', 'SupportAdmin') THEN
    RAISE EXCEPTION 'Unauthorized: Only SuperAdmin and SupportAdmin can block devices';
  END IF;

  IF justification IS NULL OR trim(justification) = '' THEN
    RAISE EXCEPTION 'Justification is required for device blocking';
  END IF;

  UPDATE public.devices
  SET is_blocked = true, blocked_reason = justification
  WHERE device_hash = target_device_hash;

  INSERT INTO public.audit_logs (device_hash, action, details)
  VALUES (
    target_device_hash,
    'DEVICE_BLOCKED',
    jsonb_build_object('justification', justification, 'admin_role', admin_role)
  );

  RETURN json_build_object('success', true);
END;
$$;

-- Unblock a device (admin only)
CREATE OR REPLACE FUNCTION public.unblock_device_secure(
  target_device_hash text,
  admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role text;
BEGIN
  admin_role := public.get_admin_role(admin_id);
  
  IF admin_role NOT IN ('SuperAdmin', 'SupportAdmin') THEN
    RAISE EXCEPTION 'Unauthorized: Only SuperAdmin and SupportAdmin can unblock devices';
  END IF;

  UPDATE public.devices
  SET is_blocked = false, blocked_reason = NULL
  WHERE device_hash = target_device_hash;

  INSERT INTO public.audit_logs (device_hash, action, details)
  VALUES (
    target_device_hash,
    'DEVICE_UNBLOCKED',
    jsonb_build_object('admin_role', admin_role)
  );

  RETURN json_build_object('success', true);
END;
$$;

-- Get audit logs (admin only)
CREATE OR REPLACE FUNCTION public.get_audit_logs_secure(p_limit int DEFAULT 100)
RETURNS TABLE (
  id uuid,
  created_at timestamp with time zone,
  user_id uuid,
  device_hash text,
  action text,
  details jsonb
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
    al.id,
    al.created_at,
    al.user_id,
    al.device_hash,
    al.action,
    al.details
  FROM public.audit_logs al
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ========================================
-- STEP 7: GRANT PERMISSIONS
-- ========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ========================================
-- STEP 8: CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_devices_is_blocked ON public.devices(is_blocked);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON public.devices(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_triggered_at ON public.emergency_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_email_sent ON public.emergency_alerts(email_sent_to_user, email_sent_to_admin);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id ON public.emergency_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON public.emergency_alerts(status);
