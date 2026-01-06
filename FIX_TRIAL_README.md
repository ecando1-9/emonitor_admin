# Fix for Trial Settings and User Visibility

This patch resolves two critical issues:
1. **New users not getting the correct trial settings**: The system was ignoring your configured "Free Trial Days" and defaulting to hardcoded values or failing if device data was missing.
2. **New users not showing in the Users list**: The list previously hid any user who didn't have an active subscription/trial.

## ✅ Changes Made

### 1. Updated `get_users_with_subscriptions()`
- Changed the query to show **ALL** users, even if they don't have a plan yet.
- Users without a plan will show as "No Plan" or "N/A" instead of being invisible.
- New users appear at the top of the list.

### 2. Updated `handle_new_user_setup()`
- **Respects Your Settings**: Now reads `free_trial_days` and `auto_create_trial` from your `app_config`.
- **More Robust**: No longer fails completely if a user signs up from the web (without a device hash) or if the email pool is empty.
- **Web Signups**: Assigns a placeholder device hash for web signups so they can still get a trial.

## 🚀 How to Apply the Fix

1. Open your **Supabase Dashboard**.
2. Go to the **SQL Editor**.
3. Create a **New Query**.
4. Copy and paste the contents of `FIX_TRIAL_LOGIC.sql`.
5. Click **Run**.

## 🔍 Verification

After running the script:
1. Create a new user (via your app or manually).
2. Go to the **Users** page in your admin panel.
3. You should see the new user immediately.
4. The user should have a "Trialing" status with the exact number of days you configured in Settings.
