# ✅ Trial Settings - Deployment Checklist

Use this checklist to ensure proper deployment of the Trial Settings feature.

---

## 📋 Pre-Deployment Checklist

### 1. Database Setup

- [ ] **Open Supabase Dashboard**
  - Navigate to your project
  - Go to SQL Editor

- [ ] **Run Migration Script**
  - Copy contents of `TRIAL_SETTINGS_SETUP.sql`
  - Paste into SQL Editor
  - Click "Run" or press Ctrl+Enter
  - Verify: "Success. No rows returned"

- [ ] **Verify Settings Created**
  ```sql
  SELECT * FROM public.app_config 
  WHERE key IN ('free_trial_days', 'auto_create_trial');
  ```
  - Expected: 2 rows
  - `free_trial_days` = "7"
  - `auto_create_trial` = "true"

- [ ] **Verify RPC Function**
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name = 'update_app_config_secure';
  ```
  - Expected: 1 row returned

- [ ] **Verify RLS Policies**
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'app_config';
  ```
  - Expected: 1 policy (SELECT for admins)

### 2. Admin Role Verification

- [ ] **Check Your Admin Role**
  ```sql
  SELECT role, is_active 
  FROM public.admin_roles 
  WHERE user_id = auth.uid();
  ```
  - Expected: role = 'SuperAdmin', is_active = true

- [ ] **Upgrade to SuperAdmin (if needed)**
  ```sql
  UPDATE public.admin_roles 
  SET role = 'SuperAdmin' 
  WHERE user_id = 'your-user-id-here';
  ```

### 3. Frontend Verification

- [ ] **Development Server Running**
  - Navigate to http://localhost:5173
  - No console errors
  - Page loads successfully

- [ ] **Navigation Updated**
  - "Trial Settings" appears in sidebar
  - Located after "Emergency Alerts"
  - Settings2 icon visible

- [ ] **Route Working**
  - Can navigate to `/trial-settings`
  - Page loads without errors
  - No 404 errors

---

## 🧪 Testing Checklist

### 1. Page Load Tests

- [ ] **Initial Load**
  - Page displays loading spinner
  - Settings load from database
  - Current values display correctly
  - No console errors

- [ ] **UI Elements Present**
  - Header with title and icon
  - Last updated timestamp
  - Trial days input field
  - Auto-create toggle button
  - Save and Reset buttons
  - "How It Works" section

### 2. Functionality Tests

- [ ] **Trial Days Input**
  - Can type numbers
  - Min value: 1 (enforced)
  - Max value: 365 (enforced)
  - Preview updates in real-time
  - Shows "days" suffix

- [ ] **Auto-Create Toggle**
  - Can click to toggle
  - Button changes color (green when enabled)
  - Status text updates
  - Warning appears when disabled

- [ ] **Change Detection**
  - "Unsaved changes" warning appears
  - Save button enables
  - Reset button enables
  - Warning disappears after save

- [ ] **Save Functionality**
  - Click "Save Settings"
  - Shows loading state
  - Success toast appears
  - Settings persist
  - Last updated timestamp updates

- [ ] **Reset Functionality**
  - Make changes
  - Click "Reset"
  - Values revert to original
  - Unsaved warning disappears

### 3. Validation Tests

- [ ] **Invalid Input Handling**
  - Try value < 1 → Error message
  - Try value > 365 → Error message
  - Try non-numeric → Prevented
  - Try empty value → Error message

- [ ] **Error Handling**
  - Network error → Error toast
  - Permission error → Error toast
  - Database error → Error toast
  - All errors user-friendly

### 4. Security Tests

- [ ] **Authentication Required**
  - Logout
  - Try to access `/trial-settings`
  - Should redirect to login

- [ ] **SuperAdmin Only (Update)**
  - Login as SupportAdmin or ReadOnly
  - Can view settings
  - Cannot save changes
  - Error: "Only SuperAdmins can update"

- [ ] **Audit Logging**
  - Make a change and save
  - Check audit_logs table:
  ```sql
  SELECT * FROM public.audit_logs 
  WHERE action = 'update_app_config' 
  ORDER BY created_at DESC LIMIT 5;
  ```
  - Verify entry exists with correct admin_id

### 5. Integration Tests

- [ ] **Desktop App Integration**
  - Desktop app reads settings
  - Creates trial with correct duration
  - Respects auto-create toggle
  - No hardcoded values remain

- [ ] **Cross-Browser Testing**
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Edge
  - [ ] Safari (if available)

- [ ] **Responsive Design**
  - [ ] Desktop (1920x1080)
  - [ ] Laptop (1366x768)
  - [ ] Tablet (768x1024)
  - [ ] Mobile (375x667)

---

## 🚀 Deployment Checklist

### 1. Code Review

- [ ] **Review Changes**
  - TrialSettingsPage.tsx
  - supabase.ts (API functions)
  - App.tsx (routing)
  - DashboardLayout.tsx (navigation)

- [ ] **Check for Issues**
  - No TypeScript errors
  - No ESLint warnings
  - No console.log statements
  - Proper error handling

### 2. Build & Deploy

- [ ] **Build Production Version**
  ```bash
  npm run build
  ```
  - Build completes successfully
  - No errors or warnings
  - dist/ folder created

- [ ] **Deploy to Hosting**
  - Upload to Vercel/Netlify/etc.
  - Verify environment variables
  - Check deployment logs
  - No deployment errors

- [ ] **Post-Deployment Verification**
  - Visit production URL
  - Login as SuperAdmin
  - Navigate to Trial Settings
  - Test all functionality
  - Verify database connection

### 3. Database (Production)

- [ ] **Run Migration on Production**
  - Open production Supabase dashboard
  - Run TRIAL_SETTINGS_SETUP.sql
  - Verify settings created
  - Verify RPC function exists

- [ ] **Backup Database**
  - Create backup before migration
  - Store backup securely
  - Document backup location

---

## 📊 Post-Deployment Checklist

### 1. Monitoring

- [ ] **Check Error Logs**
  - Supabase logs (first 24 hours)
  - Application logs
  - Browser console errors
  - No unexpected errors

- [ ] **Monitor Performance**
  - Page load time < 2 seconds
  - API response time < 500ms
  - No memory leaks
  - No performance degradation

### 2. User Acceptance

- [ ] **Admin Training**
  - Show admins the new feature
  - Explain how to use it
  - Demonstrate save/reset
  - Answer questions

- [ ] **Documentation**
  - Share QUICKSTART guide
  - Provide access to full docs
  - Create video tutorial (optional)
  - Update admin handbook

### 3. Validation

- [ ] **Create Test User**
  - Register new user in desktop app
  - Verify trial created
  - Check trial duration matches settings
  - Confirm auto-create works

- [ ] **Test Setting Changes**
  - Change trial days to 14
  - Save settings
  - Create another test user
  - Verify new user gets 14-day trial

- [ ] **Verify Audit Trail**
  - Check audit_logs table
  - Confirm all changes logged
  - Verify admin_id correct
  - Timestamps accurate

---

## 🎯 Success Criteria

The deployment is successful when:

✅ **Database:**
- Settings exist in app_config table
- RPC function created and working
- RLS policies active
- Audit logging functional

✅ **Frontend:**
- Page loads without errors
- All UI elements present
- Navigation working
- Responsive on all devices

✅ **Functionality:**
- Can view current settings
- Can modify settings
- Can save changes
- Changes persist
- Validation works

✅ **Security:**
- Authentication required
- SuperAdmin-only updates
- Audit trail complete
- No permission errors

✅ **Integration:**
- Desktop app reads settings
- Trials created correctly
- Duration matches settings
- Auto-create toggle works

---

## 🐛 Rollback Plan

If issues occur:

### 1. Frontend Rollback

```bash
# Revert code changes
git revert <commit-hash>

# Redeploy
npm run build
# Deploy to hosting
```

### 2. Database Rollback

```sql
-- Remove RPC function
DROP FUNCTION IF EXISTS public.update_app_config_secure;

-- Remove RLS policies
DROP POLICY IF EXISTS "Admins can read app_config" ON public.app_config;

-- Optionally remove settings
DELETE FROM public.app_config 
WHERE key IN ('free_trial_days', 'auto_create_trial');
```

### 3. Desktop App Rollback

```typescript
// Restore hardcoded values temporarily
const TRIAL_DAYS = 7;
const AUTO_CREATE_TRIAL = true;
```

---

## 📝 Sign-Off

### Completed By

- [ ] **Developer:** _________________ Date: _______
- [ ] **QA Tester:** _________________ Date: _______
- [ ] **Admin:** ____________________ Date: _______
- [ ] **Manager:** __________________ Date: _______

### Notes

```
_____________________________________________________________

_____________________________________________________________

_____________________________________________________________
```

---

## 🎉 Deployment Complete!

Once all items are checked:

1. ✅ Mark deployment as complete
2. 📧 Notify stakeholders
3. 📊 Begin monitoring metrics
4. 🎯 Track success criteria
5. 🚀 Plan next enhancements

**Congratulations on a successful deployment!** 🎊

---

**Quick Reference:**
- 📖 Full Docs: `TRIAL_SETTINGS_GUIDE.md`
- 🚀 Quick Start: `TRIAL_SETTINGS_QUICKSTART.md`
- 📊 Summary: `TRIAL_SETTINGS_SUMMARY.md`
- 🔄 Comparison: `TRIAL_SETTINGS_COMPARISON.md`
