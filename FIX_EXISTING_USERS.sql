-- ===================================================
-- FIX EXISTING USERS: Create missing subscriptions and devices
-- Date: 2025-11-12
-- ===================================================

-- Step 1: Get all existing auth users who don't have subscriptions
-- This will show us which users need subscriptions
SELECT 
  u.id as user_id,
  u.email,
  CASE WHEN s.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as subscription_status
FROM auth.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id
ORDER BY u.created_at;

-- Step 2: FIRST - Create devices from user metadata (must exist before subscriptions)
INSERT INTO public.devices (device_hash, trial_count, last_user_id, last_seen)
SELECT DISTINCT
  (u.raw_user_meta_data->>'device_hash') as device_hash,
  1 as trial_count,
  u.id as last_user_id,
  now() as last_seen
FROM auth.users u
WHERE (u.raw_user_meta_data->>'device_hash') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.devices d 
    WHERE d.device_hash = (u.raw_user_meta_data->>'device_hash')
  )
ON CONFLICT (device_hash) DO NOTHING;

-- Step 3: SECOND - Create subscriptions (now devices exist)
INSERT INTO public.subscriptions (user_id, plan_id, status, trial_ends_at, device_hash)
SELECT 
  u.id as user_id,
  'base' as plan_id,
  'trialing' as status,
  now() + interval '30 days' as trial_ends_at,
  (u.raw_user_meta_data->>'device_hash') as device_hash
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions 
  WHERE user_id = u.id
)
AND (u.raw_user_meta_data->>'device_hash') IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Verify the results
SELECT 
  '=== USERS WITH SUBSCRIPTIONS ===' as info,
  u.id,
  u.email,
  s.plan_id,
  s.status,
  s.trial_ends_at,
  s.device_hash
FROM auth.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id
ORDER BY u.created_at;

SELECT 
  '=== DEVICES ===' as info,
  device_hash,
  trial_count,
  last_user_id,
  last_seen
FROM public.devices
ORDER BY last_seen DESC;
