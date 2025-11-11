# Admin Panel Setup - Final Steps

## Summary of Changes

✅ **Updated Files:**
- `supabase-migration.sql` — Complete schema with clean slate (DROP CASCADE), all tables, RLS policies, and admin RPCs
- `src/lib/supabase.ts` — Updated RPC calls to match new schema (plans, devices, subscriptions with new column names)
- `src/pages/OverviewPage.tsx` — Fixed to use `status`, `plan_id`, `plan_name` instead of old column names

✅ **Schema Ready:**
- Tables: devices, plans, subscriptions, sender_pool, sender_assignments, admin_roles, audit_logs, promotions, blocked_ips, emergency_alerts
- Plans: base (99), standard (199), premium (299) with features arrays
- Admin Functions: get_users_with_subscriptions(), get_active_devices(), extend_trial_secure(), block_device_secure(), unblock_device_secure(), get_audit_logs_secure()
- RLS: Admin access for admins via is_admin() helper, users can only see their own data

## NEXT STEPS (Do This Now)

### 1. Run the Migration in Supabase SQL Editor

Copy the ENTIRE contents of `supabase-migration.sql` from the repository and paste it into your Supabase project's SQL Editor, then run it.

This will:
- Drop all old/broken objects (CASCADE)
- Create all tables from scratch
- Insert default plans
- Create all RLS policies
- Create admin RPC functions
- Enable triggers for signup

**Expected outcome:** No errors, all tables created, functions present.

### 2. Verify Admin Role

In Supabase SQL Editor, run:

```sql
SELECT * FROM public.admin_roles WHERE user_id = '2f7f5cce-16ef-4c56-9588-f94745ae8510';
```

Should return: one row with role = 'SuperAdmin' and is_active = true.

If not present, insert it:

```sql
INSERT INTO public.admin_roles (user_id, role, is_active)
VALUES ('2f7f5cce-16ef-4c56-9588-f94745ae8510', 'SuperAdmin', true);
```

### 3. Verify Functions Exist

In SQL Editor, run:

```sql
SELECT proname, pg_get_function_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE proname IN ('is_admin','get_users_with_subscriptions','get_active_devices','extend_trial_secure','block_device_secure')
ORDER BY proname;
```

Should show 5 functions. If not, the migration didn't run correctly.

### 4. Restart Dev Server

```powershell
# If running, stop with Ctrl+C, then:
npm run dev
```

This will pick up any environment changes and refresh the app.

### 5. Log In as Admin

- Go to http://localhost:5176/login
- Use your email and password (the account linked to UUID 2f7f5cce-16ef-4c56-9588-f94745ae8510)
- Click "Login"

### 6. Check Overview Page

- After login, you should see the dashboard with stats (may show 0 users initially)
- No errors should appear

If you see "Insufficient permissions" or "404" — the admin role or RPC is missing. Re-check steps 1–3.

## Troubleshooting

**Error: "function public.is_admin(uuid) does not exist"**
→ Migration didn't run fully. Re-run supabase-migration.sql in Supabase SQL Editor.

**Error: "Insufficient permissions"**
→ Admin role not in admin_roles table for the logged-in user's UUID.
→ Check the user UUID matches in auth and admin_roles.

**No users/subscriptions showing**
→ Expected if no test data created. To add test data, run in Supabase SQL Editor:

```sql
INSERT INTO public.devices (device_hash, trial_count, last_user_id)
VALUES ('test-device-001', 1, '<SOME_USER_UUID>') ON CONFLICT DO NOTHING;

INSERT INTO public.subscriptions (user_id, plan_id, status, trial_ends_at, device_hash)
SELECT u.id, 'base', 'trialing', now() + interval '30 days', 'test-device-001'
FROM auth.users u
LIMIT 1;
```

## Key Features Now Available

1. **Admin Dashboard** (Overview page)
   - View all users with subscriptions
   - See active trials and paid plans
   - Check upcoming expirations
   - View active devices

2. **Subscription Management** (RPCs)
   - Extend trial by N days
   - Change subscription status
   - View subscription details

3. **Device Management** (RPCs)
   - View active devices
   - Block/unblock devices
   - Track trial counts per device

4. **Audit Logging**
   - All admin actions logged
   - Query audit logs via RPC

5. **Plan Management**
   - 3 default plans (base, standard, premium)
   - Each plan has features array
   - Plans can be queried and updated

## Next Advanced Steps (After Testing)

- [ ] Implement plan selection UI for users
- [ ] Build feature flag system (check_feature_enabled per user)
- [ ] Add device blocking UI to admin panel
- [ ] Create promo/trial extension UI for admins
- [ ] Build audit log viewer UI

---

**Status:** Migration ready, frontend updated. Now sync DB schema.
