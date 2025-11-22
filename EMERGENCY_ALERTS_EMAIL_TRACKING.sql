-- ========================================
-- EMERGENCY ALERTS EMAIL TRACKING MIGRATION
-- ========================================
-- This migration adds email and notification tracking columns
-- to the emergency_alerts table to track:
-- - When alerts are triggered
-- - Email notifications sent to users and admins
-- - Email details (subject, body, sent_at, etc.)
-- - Number of users and emergency contacts notified
-- ========================================

-- Add user information columns (if not already present)
DO $$ 
BEGIN
  -- Add user_phone if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'user_phone'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN user_phone text;
  END IF;

  -- Add user_email if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'user_email'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN user_email text;
  END IF;

  -- Add user_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'user_name'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN user_name text;
  END IF;

  -- Add device_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'device_name'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN device_name text;
  END IF;

  -- Add emergency_contacts if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'emergency_contacts'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN emergency_contacts jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add email tracking columns
DO $$ 
BEGIN
  -- Track if email was sent to user
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'email_sent_to_user'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN email_sent_to_user boolean DEFAULT false;
  END IF;

  -- Track if email was sent to admin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'email_sent_to_admin'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN email_sent_to_admin boolean DEFAULT false;
  END IF;

  -- Track when email was sent to user
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'email_sent_to_user_at'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN email_sent_to_user_at timestamp with time zone;
  END IF;

  -- Track when email was sent to admin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'email_sent_to_admin_at'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN email_sent_to_admin_at timestamp with time zone;
  END IF;

  -- Store all email details (subject, body, recipients, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'email_details'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN email_details jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add notification tracking columns
DO $$ 
BEGIN
  -- Count of users notified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'users_notified_count'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN users_notified_count integer DEFAULT 0;
  END IF;

  -- Count of emergency contacts notified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'emergency_contacts_notified_count'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN emergency_contacts_notified_count integer DEFAULT 0;
  END IF;

  -- Track which emergency contacts were notified (array of contact info)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'emergency_contacts_notified'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN emergency_contacts_notified jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Track which admins were notified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'admins_notified'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN admins_notified jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add trigger timestamp for when alert was triggered (if different from created_at)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_alerts' 
    AND column_name = 'triggered_at'
  ) THEN
    ALTER TABLE public.emergency_alerts 
    ADD COLUMN triggered_at timestamp with time zone DEFAULT now();
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_triggered_at 
ON public.emergency_alerts(triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_email_sent 
ON public.emergency_alerts(email_sent_to_user, email_sent_to_admin);

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id 
ON public.emergency_alerts(user_id);

-- Add comments for documentation
COMMENT ON COLUMN public.emergency_alerts.triggered_at IS 'Timestamp when the emergency alert was triggered';
COMMENT ON COLUMN public.emergency_alerts.email_sent_to_user IS 'Whether email notification was sent to the user';
COMMENT ON COLUMN public.emergency_alerts.email_sent_to_admin IS 'Whether email notification was sent to admin(s)';
COMMENT ON COLUMN public.emergency_alerts.email_sent_to_user_at IS 'Timestamp when email was sent to user';
COMMENT ON COLUMN public.emergency_alerts.email_sent_to_admin_at IS 'Timestamp when email was sent to admin(s)';
COMMENT ON COLUMN public.emergency_alerts.email_details IS 'JSONB object containing email details: {user_email: {subject, body, sent_at, recipient}, admin_emails: [{subject, body, sent_at, recipient, admin_id}]}';
COMMENT ON COLUMN public.emergency_alerts.users_notified_count IS 'Number of users notified about this alert';
COMMENT ON COLUMN public.emergency_alerts.emergency_contacts_notified_count IS 'Number of emergency contacts notified';
COMMENT ON COLUMN public.emergency_alerts.emergency_contacts_notified IS 'JSONB array of emergency contacts that were notified: [{name, phone, email, notified_at}]';
COMMENT ON COLUMN public.emergency_alerts.admins_notified IS 'JSONB array of admins that were notified: [{admin_id, email, notified_at}]';
COMMENT ON COLUMN public.emergency_alerts.user_phone IS 'Phone number of the user who triggered the alert';
COMMENT ON COLUMN public.emergency_alerts.user_email IS 'Email address of the user who triggered the alert';
COMMENT ON COLUMN public.emergency_alerts.user_name IS 'Name of the user who triggered the alert';
COMMENT ON COLUMN public.emergency_alerts.device_name IS 'Name/identifier of the device that triggered the alert';
COMMENT ON COLUMN public.emergency_alerts.emergency_contacts IS 'JSONB array of emergency contacts: [{name, phone, email, relationship}]';

-- ========================================
-- Example email_details JSONB structure:
-- ========================================
-- {
--   "user_email": {
--     "subject": "Emergency Alert Triggered",
--     "body": "Your emergency alert has been triggered...",
--     "sent_at": "2024-01-15T10:30:00Z",
--     "recipient": "user@example.com",
--     "sender_email": "noreply@emonitor.com",
--     "status": "sent" | "failed" | "pending"
--   },
--   "admin_emails": [
--     {
--       "subject": "Emergency Alert: User Name",
--       "body": "An emergency alert has been triggered...",
--       "sent_at": "2024-01-15T10:30:05Z",
--       "recipient": "admin@example.com",
--       "admin_id": "uuid-here",
--       "sender_email": "noreply@emonitor.com",
--       "status": "sent" | "failed" | "pending"
--     }
--   ]
-- }
-- ========================================

