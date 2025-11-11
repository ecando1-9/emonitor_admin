-- ===================================================
-- TEST DATA: Populate dashboard with sample data
-- Date: 2025-11-12
-- ===================================================

-- Create test devices
INSERT INTO public.devices (device_hash, trial_count, is_blocked, last_seen)
VALUES
  ('device-001', 1, false, now() - interval '2 days'),
  ('device-002', 2, false, now() - interval '5 days'),
  ('device-003', 3, false, now()),
  ('device-004', 5, true, now() - interval '10 days')
ON CONFLICT DO NOTHING;

-- Create some test users (use existing auth users or create new ones)
-- For now, we'll create subscriptions that reference the admin user
-- Then create additional subscriptions for testing

-- Add subscription for admin user (if not exists)
INSERT INTO public.subscriptions (user_id, plan_id, status, trial_ends_at, device_hash)
SELECT 
  '2f7f5cce-16ef-4c56-9588-f94745ae8510'::uuid,
  'premium',
  'trialing',
  now() + interval '5 days',
  'device-001'
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions 
  WHERE user_id = '2f7f5cce-16ef-4c56-9588-f94745ae8510'::uuid
)
ON CONFLICT (user_id) DO NOTHING;

-- Now check what we have
SELECT 
  '=== DEVICES ===' as section,
  device_hash,
  trial_count,
  is_blocked,
  last_seen
FROM public.devices
ORDER BY last_seen DESC;

SELECT 
  '=== SUBSCRIPTIONS ===' as section,
  user_id,
  plan_id,
  status,
  trial_ends_at,
  device_hash
FROM public.subscriptions
ORDER BY created_at DESC;

SELECT 
  '=== PLANS ===' as section,
  id,
  name,
  price,
  features
FROM public.plans
ORDER BY price;

SELECT 
  '=== ADMIN ROLES ===' as section,
  user_id,
  role,
  is_active
FROM public.admin_roles
WHERE is_active = true;
