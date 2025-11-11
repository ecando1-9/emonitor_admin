# Dashboard Error Debugging Guide

## Quick Troubleshooting Steps

### 1. Check Browser Console (Most Important)
Open your browser's DevTools:
- **Windows/Linux:** Press `F12` or `Ctrl+Shift+I`
- **Mac:** Press `Cmd+Option+I`

Go to the **Console** tab and look for any red error messages. Common issues:

#### Error: "Insufficient permissions"
→ Admin role missing or user UUID doesn't match
→ Solution: Run in Supabase SQL Editor:
```sql
SELECT * FROM public.admin_roles WHERE user_id = '2f7f5cce-16ef-4c56-9588-f94745ae8510';
```
If empty, insert the admin role:
```sql
INSERT INTO public.admin_roles (user_id, role, is_active)
VALUES ('2f7f5cce-16ef-4c56-9588-f94745ae8510', 'SuperAdmin', true);
```

#### Error: "RPC not found"
→ Migration didn't run or functions not created
→ Solution: Re-run `supabase-migration.sql` in Supabase SQL Editor (copy entire file and paste)

#### Error: "Auth session not found" or login page stays blank
→ Supabase connection issue
→ Solution: Verify `.env.local`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
```
If missing, add them and restart dev server (`npm run dev`)

---

### 2. Verify Admin Role Exists

Run this in Supabase SQL Editor:
```sql
-- Check your admin role
SELECT id, user_id, role, is_active FROM public.admin_roles 
WHERE user_id = '2f7f5cce-16ef-4c56-9588-f94745ae8510';

-- If empty, insert it
INSERT INTO public.admin_roles (user_id, role, is_active)
VALUES ('2f7f5cce-16ef-4c56-9588-f94745ae8510', 'SuperAdmin', true)
ON CONFLICT DO NOTHING;
```

---

### 3. Verify Functions Exist

Run in Supabase SQL Editor:
```sql
-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname IN (
  'get_users_with_subscriptions',
  'get_active_devices',
  'is_admin',
  'get_admin_role'
) ORDER BY proname;
```

Should show 4 functions. If not, re-run the migration.

---

### 4. Restart Dev Server

After any DB changes, always restart:
```powershell
# Stop current server (Ctrl+C)
# Then:
npm run dev
```

---

### 5. Check Network Tab (Inspect RPC Calls)

In DevTools, go to **Network** tab:
1. Try to login and navigate to Overview
2. Look for requests to `/rest/v1/rpc/get_users_with_subscriptions`
3. Click it and check the response:
   - **200 OK** = function exists and works
   - **404** = function missing (re-run migration)
   - **401/403** = permissions denied (check admin role)
   - **Error message** = read carefully

---

### 6. Test Login Manually

If login doesn't work:
1. Open DevTools Console
2. Paste this and press Enter:
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'your-email@example.com',
  password: 'your-password'
});
console.log('Login result:', { data, error });
```
This will show exactly why login fails.

---

### 7. Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Failed to load dashboard data" | RPC fails or admin role missing | Verify admin_roles table has your user |
| Login page blank/frozen | Supabase not initialized | Check .env.local has VITE_SUPABASE_URL |
| Redirect loop on login | Session not persisting | Check browser localStorage isn't full |
| 404 on RPC calls | Functions not created | Re-run supabase-migration.sql |

---

## Next Steps

1. **Open browser DevTools (F12)**
2. **Go to Console tab**
3. **Look for red errors**
4. **Share the error message here**

I'll then provide the exact fix based on the specific error you're seeing.

---

**Restart dev server after making any changes:**
```powershell
npm run dev
```
