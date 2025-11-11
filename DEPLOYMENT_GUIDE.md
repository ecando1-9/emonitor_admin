# eCantech Admin Dashboard - Complete Setup Guide

## Overview

This is a production-ready **eCantech Admin Dashboard** built with:
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS + RPC Functions)
- **State Management**: Zustand with persistence
- **UI Components**: Radix UI + Lucide Icons

## Key Features

✅ **User Management**
- Create, update, and manage admin users
- Role-based access control (SuperAdmin, SupportAdmin, ReadOnly)

✅ **Subscription Management**
- 1-month free trial for all new users
- Track trial end dates and days remaining
- Extend trials manually
- Convert to paid subscriptions (Basic, Premium, Enterprise)
- Suspend/cancel subscriptions

✅ **Device Management**
- Track devices with unique device hashes
- Monitor device trial counts
- Block/unblock devices
- Audit all device actions

✅ **Feature Control**
- Manage features based on subscription plan
- Promotions system (percentage, fixed, or trial day discounts)
- Email sender pool management

✅ **Audit Logging**
- Track all admin actions (trial extensions, device blocks, user suspensions)
- Searchable audit logs with timestamps

✅ **Dashboard Analytics**
- Real-time stats: active users, trials, subscriptions, devices
- Upcoming expiration alerts
- Trial-to-paid conversion metrics
- System health indicators

## Architecture

### Database Schema

All tables are in `public` schema with Row-Level Security (RLS) enabled:

**Core Tables:**
- `subscriptions` - User subscription status, plans, trial/paid dates
- `devices` - Device tracking, trial counts, block status
- `admin_roles` - Admin user assignments and roles
- `audit_logs` - Complete audit trail of admin actions
- `sender_pool` - SMTP sender credentials
- `sender_assignments` - User-to-sender mappings
- `promotions` - Discount/trial promotions
- `blocked_ips` - Blocked IP addresses for security

**RPC Functions** (Secure, exposed via API):
- `get_subscription_status(p_user_id)` - Get user's subscription details
- `extend_trial_secure(p_user_id, p_days)` - Extend user trial by N days
- `block_device_secure(p_device_hash, p_reason)` - Block a device
- `unblock_device_secure(p_device_hash)` - Unblock a device
- `reset_device_trial_secure(p_device_hash)` - Reset device trial count
- `get_active_devices()` - List all active devices
- `get_users_with_subscriptions()` - List all users with subscription summaries
- `assign_sender_secure(...)` - Assign SMTP sender to user
- `suspend_subscription_secure(p_user_id, p_reason)` - Suspend a subscription
- `get_audit_logs_secure(p_limit, p_action)` - Retrieve filtered audit logs

### Security Model

**Authentication:**
- Supabase Auth for user login (email/password or social)
- JWT tokens stored in secure localStorage
- Session auto-refresh

**Authorization (RLS):**
- All database access filtered by `auth.uid()`
- Only admin users can perform privileged operations
- Helper function `is_admin(user_id)` checks admin_roles table

**API Security:**
- All operations use RPC functions (not direct table access)
- RPC functions check admin role before executing
- Audit logging on every admin action

## Getting Started

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier OK)

### 2. Clone & Install

```bash
cd c:\Users\yuvak\Downloads\ecantech_esolutions\projects\emonitor-a
npm install --legacy-peer-deps
```

### 3. Supabase Setup

#### 3a. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your `PROJECT_URL` and `ANON_KEY` from Project Settings → API Keys

#### 3b. Run Migration

1. Copy the entire contents of `supabase-migration.sql`
2. In Supabase dashboard: SQL Editor → paste and execute
3. Or use Supabase CLI:
   ```bash
   supabase db push --local
   ```

#### 3c. Create Admin User

1. Create a test user in Supabase Auth (email/password)
2. Get the user's UUID
3. In SQL Editor, run:
   ```sql
   INSERT INTO admin_roles (user_id, role, is_active)
   VALUES ('YOUR_USER_UUID_HERE', 'SuperAdmin', true);
   ```

### 4. Environment Configuration

Create `.env.local` in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Start Development Server

```bash
npm run dev
```

App will be available at `http://localhost:5176/` (or next available port)

### 6. Login

Use the test admin account you created in Supabase Auth

## Usage Guide

### Manage Subscriptions

**Dashboard Overview**
- Navigate to `http://localhost:5176/`
- View active users, trials, paid subscriptions, devices
- See upcoming expirations in the "Expiring Soon" widget

**Extend Trial**
1. Go to Users page (left sidebar)
2. Find the user
3. Click "Extend Trial"
4. Enter number of days (e.g., 7)
5. Action is logged in Audit Log

**Create New Subscription**
1. Go to Subscriptions page
2. Click "Create Subscription"
3. Select user, plan type (Basic/Premium/Enterprise)
4. Set trial end date (1 month from now by default)
5. Submit

### Block Devices

1. Go to Devices page
2. Find the device by hash or user
3. Click "Block" button
4. Enter reason (e.g., "Suspected fraud")
5. Device is blocked immediately and cannot authenticate

### Manage Promotions

1. Go to Promotions page
2. Click "New Promotion"
3. Choose type: **Percentage** (10% off), **Fixed** ($5 off), or **Trial Days** (add 7 extra days)
4. Set target plans (Basic, Premium, Enterprise)
5. Set date range
6. Promotions are applied automatically during signup/renewal

### View Audit Logs

1. Go to Audit Log page
2. Filter by action type (extend_trial, block_device, suspend_subscription, etc.)
3. Each log shows admin, user, timestamp, and action details
4. Export logs as CSV

### Manage Admin Access

1. Go to Security page
2. Click "Add Admin"
3. Enter user email
4. Select role: **SuperAdmin** (full access), **SupportAdmin** (limited), **ReadOnly** (view only)
5. Activate/deactivate admins as needed

## Subscription Plans & Features

### Basic ($9/month)
- ✅ 1 device
- ✅ 1 sender email
- ✅ Basic support

### Premium ($29/month)
- ✅ 5 devices
- ✅ 5 sender emails
- ✅ Priority support
- ✅ Advanced analytics

### Enterprise (Custom)
- ✅ Unlimited devices
- ✅ Unlimited senders
- ✅ Dedicated support
- ✅ Custom features

## Deployment

### Deploy to Vercel

```bash
vercel deploy
```

Environment variables (set in Vercel dashboard):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Production Checklist

- [ ] Update `.env.local` with production Supabase URL/key
- [ ] Enable RLS policies (already enabled in migration)
- [ ] Create production admin users
- [ ] Set up email notifications for trial expiry (future feature)
- [ ] Configure backup strategy in Supabase
- [ ] Enable 2FA for admin accounts
- [ ] Review RLS policies and audit logs regularly

## Troubleshooting

### "Cannot find module" errors
```bash
npm install --legacy-peer-deps
npm run dev
```

### Supabase connection errors
- Check `.env.local` variables
- Verify Supabase project is running
- Check network connection

### Trial extension not working
- Verify admin role exists for your user in `admin_roles` table
- Check RLS policies are enabled
- View browser console for error messages

### Device blocking fails
- Device hash must match exactly
- Admin must have active role

## API Reference

### Frontend secureAPI

All methods are in `src/lib/supabase.ts`:

```typescript
// Get subscription status
await secureAPI.getSubscriptionStatus(userId);

// Extend trial by N days
await secureAPI.extendTrialByDays(userId, 7);

// Block a device
await secureAPI.blockDevice(deviceHash, "Reason");

// Get all users with subscriptions
await secureAPI.getUsersWithSubscriptions();

// Get active devices
await secureAPI.getActiveDevices();

// Create promotion
await secureAPI.createPromotion(
  "Summer Sale",
  "percentage",
  ["basic", "premium"],
  10, // 10% discount
  undefined,
  "2025-06-01",
  "2025-06-30",
  "Limited time offer!"
);

// Get audit logs
await secureAPI.getAuditLogs(100, "extend_trial");
```

## Database Backups

Supabase automatically backs up your database daily. To restore:

1. Supabase dashboard → Backups → select a backup → Restore
2. Or use Supabase CLI: `supabase db restore --backup-id <id>`

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **React Router Docs**: https://reactrouter.com
- **Tailwind CSS**: https://tailwindcss.com
- **Zustand**: https://github.com/pmndrs/zustand

## File Structure

```
src/
├── App.tsx                 # Routes config
├── main.tsx               # Entry point with RouterProvider
├── index.css              # Tailwind + CSS variables
├── components/
│   ├── DashboardLayout.tsx   # Main layout with sidebar
│   └── ui/                   # UI components (button, card, etc.)
├── lib/
│   ├── supabase.ts        # Supabase client + secureAPI
│   └── utils.ts           # cn() helper
├── hooks/
│   └── use-toast.ts       # Toast notifications
├── pages/
│   ├── OverviewPage.tsx     # Dashboard overview
│   ├── UsersPage.tsx        # User management
│   ├── DevicesPage.tsx      # Device management
│   ├── SubscriptionsPage.tsx
│   ├── PromotionsPage.tsx
│   ├── EmailPoolPage.tsx
│   ├── SecurityPage.tsx
│   ├── AuditLogPage.tsx
│   └── LoginPage.tsx
└── store/
    └── auth-store.ts      # Zustand auth store
```

## License

Proprietary - eCantech Solutions

---

**Last Updated**: November 2025  
**Version**: 1.0.0
