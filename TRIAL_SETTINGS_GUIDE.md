# Trial Settings Feature - Implementation Guide

## Overview

The Trial Settings feature allows administrators to configure free trial options for new users through a dedicated admin panel page. This includes setting the trial duration and controlling whether trials are automatically created upon user registration.

## Features

### 1. **Free Trial Days Configuration**
- Set the number of days for free trials (1-365 days)
- Real-time preview of how the setting affects new users
- Input validation to ensure valid range

### 2. **Auto-Create Trial Toggle**
- Enable/disable automatic trial creation on signup
- Visual status indicators
- Warning alerts when disabled

### 3. **User Interface**
- Modern, premium design with glassmorphism effects
- Real-time change detection
- Unsaved changes warning
- Last updated timestamp
- Comprehensive help section

### 4. **Security**
- Row Level Security (RLS) policies
- Only SuperAdmins can update settings
- All admins can view settings
- Audit trail with updated_by tracking

## Database Schema

### app_config Table

```sql
CREATE TABLE public.app_config (
  key text NOT NULL PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);
```

### Settings Stored

| Key | Default Value | Description |
|-----|---------------|-------------|
| `free_trial_days` | `"7"` | Number of days for free trial |
| `auto_create_trial` | `"true"` | Automatically create trial on signup |

## Installation

### Step 1: Run SQL Migration

Execute the `TRIAL_SETTINGS_SETUP.sql` file in your Supabase SQL Editor:

```bash
# Navigate to Supabase Dashboard > SQL Editor
# Copy and paste the contents of TRIAL_SETTINGS_SETUP.sql
# Click "Run"
```

This will:
- Insert default trial settings
- Enable RLS on app_config table
- Create policies for admin access

### Step 2: Verify Installation

Run these queries in Supabase SQL Editor:

```sql
-- Check if settings exist
SELECT * FROM public.app_config 
WHERE key IN ('free_trial_days', 'auto_create_trial');

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'app_config';
```

Expected output:
- 2 rows in app_config table
- 2 RLS policies (SELECT for all admins, UPDATE for SuperAdmins)

## Usage

### Accessing the Page

1. Log in to the admin panel
2. Navigate to **Trial Settings** in the sidebar
3. The page will load current settings from the database

### Changing Settings

1. **Modify Trial Days:**
   - Enter a number between 1 and 365
   - See real-time preview of the change

2. **Toggle Auto-Create:**
   - Click the toggle button to enable/disable
   - Read the warning if disabling

3. **Save Changes:**
   - Click "Save Settings" button
   - Wait for confirmation toast
   - Changes are immediately applied

### Testing

After changing settings, test with a new user:

1. Change trial days to `14`
2. Enable auto-create trial
3. Click "Save Settings"
4. Create a new user account in the desktop app
5. Verify in Subscriptions page:
   - User has a trial subscription
   - Trial ends 14 days from now

## API Functions

### Frontend (TypeScript)

```typescript
// Get current settings
const settings = await secureAPI.getAppConfig([
  'free_trial_days', 
  'auto_create_trial'
]);

// Update a setting
await secureAPI.updateAppConfig(
  'free_trial_days',
  '14',
  adminUserId
);
```

### Backend (Supabase)

```sql
-- Read settings (all admins)
SELECT * FROM public.app_config
WHERE key IN ('free_trial_days', 'auto_create_trial');

-- Update setting (SuperAdmins only)
UPDATE public.app_config
SET value = '14', 
    updated_at = NOW(), 
    updated_by = 'admin-user-id'
WHERE key = 'free_trial_days';
```

## Integration with Desktop App

The desktop application should read these settings during user registration:

```typescript
// Example integration in desktop app
async function createUserTrial(userId: string) {
  // Fetch settings
  const { data: settings } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['free_trial_days', 'auto_create_trial']);
  
  const autoCreate = settings.find(s => s.key === 'auto_create_trial')?.value === 'true';
  const trialDays = parseInt(settings.find(s => s.key === 'free_trial_days')?.value || '7');
  
  if (autoCreate) {
    // Create trial subscription
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
    
    await supabase.from('subscriptions').insert({
      user_id: userId,
      status: 'trialing',
      trial_ends_at: trialEndsAt.toISOString()
    });
  }
}
```

## Security Considerations

### Row Level Security (RLS)

The app_config table has RLS enabled with these policies:

1. **Read Access (All Admins):**
   - Any authenticated user with an active admin role can read settings
   - Required for displaying current values

2. **Write Access (SuperAdmins Only):**
   - Only SuperAdmins can update settings
   - Prevents unauthorized modifications

### Audit Trail

Every update records:
- `updated_at`: Timestamp of the change
- `updated_by`: UUID of the admin who made the change

Query audit history:
```sql
SELECT key, value, updated_at, updated_by
FROM public.app_config
WHERE key IN ('free_trial_days', 'auto_create_trial')
ORDER BY updated_at DESC;
```

## Troubleshooting

### Issue: "Permission denied for table app_config"

**Solution:**
1. Verify RLS policies are created
2. Check if user has admin role
3. Run: `SELECT * FROM public.admin_roles WHERE user_id = auth.uid();`

### Issue: Settings not saving

**Solution:**
1. Check if user is SuperAdmin (not just SupportAdmin or ReadOnly)
2. Verify network connection
3. Check browser console for errors

### Issue: Desktop app not respecting new settings

**Solution:**
1. Ensure desktop app reads from app_config table
2. Restart desktop app after changing settings
3. Clear any cached values in desktop app

## File Structure

```
emonitor-a/
├── src/
│   ├── pages/
│   │   └── TrialSettingsPage.tsx      # Main settings page
│   ├── lib/
│   │   └── supabase.ts                # API functions added
│   ├── components/
│   │   └── DashboardLayout.tsx        # Navigation updated
│   └── App.tsx                        # Route added
└── TRIAL_SETTINGS_SETUP.sql           # Database migration
```

## Future Enhancements

Potential improvements for future versions:

1. **Settings History:**
   - Track all changes in an audit table
   - Show history of who changed what and when

2. **Advanced Trial Options:**
   - Different trial lengths per plan
   - Grace period after trial expires
   - Trial extension limits

3. **Notifications:**
   - Email admins when settings change
   - Alert when trials are about to expire

4. **Analytics:**
   - Trial conversion rate
   - Average trial duration before upgrade
   - Most effective trial length

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase logs for errors
3. Verify RLS policies are correctly set
4. Contact development team

## Changelog

### Version 1.0.0 (Initial Release)
- Basic trial days configuration
- Auto-create trial toggle
- RLS policies for security
- Modern UI with real-time validation
- Comprehensive documentation
