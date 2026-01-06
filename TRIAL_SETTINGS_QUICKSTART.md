# Quick Setup Guide - Trial Settings

## ⚡ Quick Start (3 Steps)

### Step 1: Run the SQL Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `TRIAL_SETTINGS_SETUP.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

You should see: ✅ Success. No rows returned

### Step 2: Verify Installation

Run this query in the SQL Editor:

```sql
-- Check if settings exist
SELECT * FROM public.app_config 
WHERE key IN ('free_trial_days', 'auto_create_trial');
```

Expected result: 2 rows showing:
- `free_trial_days` = "7"
- `auto_create_trial` = "true"

### Step 3: Test the Feature

1. Refresh your admin panel (http://localhost:5173)
2. Click **Trial Settings** in the sidebar
3. Change trial days to `14`
4. Click **Save Settings**
5. You should see: ✅ "Settings saved successfully!"

---

## 🔧 Troubleshooting

### Error: "permission denied for table app_config"

**Cause:** The SQL migration hasn't been run yet.

**Solution:** 
1. Go to Supabase Dashboard → SQL Editor
2. Run the `TRIAL_SETTINGS_SETUP.sql` file
3. Refresh your admin panel

### Error: "Configuration key not found"

**Cause:** The default settings weren't inserted.

**Solution:**
```sql
-- Manually insert the settings
INSERT INTO public.app_config (key, value, description, updated_at)
VALUES 
  ('free_trial_days', '7', 'Number of days for free trial', NOW()),
  ('auto_create_trial', 'true', 'Automatically create trial on signup', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;
```

### Error: "Only SuperAdmins can update app configuration"

**Cause:** Your admin account is not a SuperAdmin.

**Solution:**
```sql
-- Check your role
SELECT role FROM public.admin_roles WHERE user_id = auth.uid();

-- If you need to upgrade to SuperAdmin:
UPDATE public.admin_roles 
SET role = 'SuperAdmin' 
WHERE user_id = 'your-user-id-here';
```

### Error: "function update_app_config_secure does not exist"

**Cause:** The RPC function wasn't created.

**Solution:**
1. Re-run the entire `TRIAL_SETTINGS_SETUP.sql` file
2. Make sure there are no syntax errors in the SQL

---

## 📋 Verification Checklist

After setup, verify everything works:

- [ ] SQL migration ran without errors
- [ ] 2 settings exist in app_config table
- [ ] RPC function `update_app_config_secure` exists
- [ ] Trial Settings page loads without errors
- [ ] Can view current settings
- [ ] Can change trial days (1-365)
- [ ] Can toggle auto-create trial
- [ ] Save button works
- [ ] Success message appears after saving
- [ ] Changes persist after page refresh

---

## 🎯 What Gets Created

### Database Objects

1. **Table Rows:**
   - `app_config.free_trial_days` = "7"
   - `app_config.auto_create_trial` = "true"

2. **RLS Policy:**
   - `Admins can read app_config` (SELECT for all admins)

3. **RPC Function:**
   - `update_app_config_secure(config_key, config_value, admin_id)`
   - SECURITY DEFINER (runs with elevated privileges)
   - Only SuperAdmins can execute

### Frontend Files

1. **Page:** `src/pages/TrialSettingsPage.tsx`
2. **Route:** `/trial-settings`
3. **Navigation:** Added to sidebar
4. **API Functions:** Added to `src/lib/supabase.ts`

---

## 🚀 Next Steps

After successful setup:

1. **Test with a new user:**
   - Create a test account in desktop app
   - Verify trial is created automatically
   - Check trial duration matches your setting

2. **Customize settings:**
   - Adjust trial days as needed
   - Toggle auto-create based on your business model

3. **Monitor usage:**
   - Check audit logs for config changes
   - Review trial conversion rates
   - Adjust settings based on data

---

## 📞 Need Help?

If you encounter issues:

1. Check the main guide: `TRIAL_SETTINGS_GUIDE.md`
2. Review Supabase logs for detailed errors
3. Verify your admin role is SuperAdmin
4. Ensure RLS policies are correctly applied

---

## 🔒 Security Notes

- ✅ All updates go through secure RPC function
- ✅ Only SuperAdmins can modify settings
- ✅ All changes are logged in audit_logs
- ✅ RLS prevents direct table access
- ✅ Admin ID is verified on every update
