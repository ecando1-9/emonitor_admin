# 🔒 Suspicious Login Monitoring - Quick Start Guide

## ⚡ Quick Setup (3 Steps)

### Step 1: Run SQL Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `SUSPICIOUS_LOGINS_SETUP.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

You should see: ✅ Success

### Step 2: Verify Installation

Run this query in the SQL Editor:

```sql
-- Check if function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_suspicious_logins';
```

Expected result: 1 row showing `get_suspicious_logins`

### Step 3: Test the Feature

1. Refresh your admin panel (http://localhost:5173)
2. Click **Suspicious Logins** in the sidebar
3. You should see the monitoring page
4. If no data, it will show "All clear! 🎉"

---

## 🎯 What This Feature Does

### Main Features

1. **Suspicious Account Detection**
   - Automatically identifies accounts with multiple failed login attempts
   - Configurable threshold (default: 5+ failed attempts)
   - Real-time monitoring

2. **Detailed Login History**
   - View complete login history for any account
   - See successful and failed attempts
   - Track IP addresses and devices
   - Timestamps for all attempts

3. **Security Actions**
   - Block suspicious IP addresses
   - View all attempts from blocked IPs
   - Monitor device patterns

4. **Statistics Dashboard**
   - Total suspicious accounts
   - Total failed attempts
   - Blocked accounts count
   - Configurable threshold

---

## 📊 Understanding the Dashboard

### Stats Cards

| Card | What It Shows |
|------|---------------|
| **Suspicious Accounts** | Number of accounts with failed attempts ≥ threshold |
| **Total Failed Attempts** | Sum of all failed login attempts |
| **Blocked Accounts** | Accounts with blocked IP addresses |
| **Threshold** | Current minimum failed attempts filter |

### Suspicious Accounts Table

Shows accounts with multiple failed attempts:

- **Email**: Account email address
- **Failed Attempts**: Number of failed login tries (red badge if ≥10)
- **Last Attempt**: When the last attempt occurred
- **IP Addresses**: List of IPs used (shows first 2)
- **Devices**: Number of different devices used
- **Status**: Active or Blocked
- **Actions**: View detailed history

---

## 🔍 How to Use

### View Suspicious Accounts

1. Navigate to **Suspicious Logins** page
2. See list of accounts with failed attempts
3. Adjust threshold if needed (default: 5)
4. Use search to find specific email

### View Login History

1. Click **View Details** on any account
2. See complete login history
3. View stats: Total, Failed, Successful attempts
4. Check IP addresses and devices
5. Block suspicious IPs if needed

### Block Suspicious IP

1. Open login history for an account
2. Find failed attempts
3. Click **Block IP** next to suspicious attempts
4. IP will be added to blocked list
5. Future logins from that IP will be prevented

### Adjust Threshold

1. Change "Minimum Failed Attempts" value
2. Click **Apply**
3. Table updates to show accounts meeting new threshold

---

## 🚨 Common Scenarios

### Scenario 1: Brute Force Attack Detected

**Symptoms:**
- Account with 10+ failed attempts
- Multiple different IP addresses
- Short time span between attempts

**Actions:**
1. View login history
2. Block all suspicious IPs
3. Consider blocking the account temporarily
4. Notify the account owner

### Scenario 2: Forgotten Password

**Symptoms:**
- 5-7 failed attempts
- Same IP address
- Followed by successful login

**Actions:**
- Monitor but no action needed
- User likely forgot password
- Eventually logged in successfully

### Scenario 3: Credential Stuffing

**Symptoms:**
- Many different accounts
- Same IP address
- All failed attempts

**Actions:**
1. Block the IP address
2. Check all affected accounts
3. Consider implementing rate limiting
4. Alert affected users

---

## 🔧 Configuration

### Change Detection Threshold

Default is 5 failed attempts. To change:

1. Use the "Minimum Failed Attempts" input
2. Enter new value (e.g., 3 for stricter, 10 for looser)
3. Click **Apply**

### Search for Specific Account

1. Use the search box
2. Type email address (partial match works)
3. Table filters in real-time

---

## 🔒 Security Best Practices

### When to Block an IP

✅ **Block if:**
- 10+ failed attempts from same IP
- Attempts across multiple accounts
- Suspicious geographic location
- Known malicious IP

❌ **Don't block if:**
- Only 5-7 attempts
- Followed by successful login
- Corporate/shared IP address
- VPN exit node

### Monitoring Frequency

- **High Security:** Check daily
- **Normal Security:** Check weekly
- **Low Risk:** Check monthly

### Response Plan

1. **Immediate (Critical):**
   - 20+ failed attempts
   - Active brute force attack
   - Multiple accounts targeted

2. **Within 24 Hours (High):**
   - 10-20 failed attempts
   - Suspicious patterns
   - Multiple IPs from same account

3. **Within Week (Medium):**
   - 5-10 failed attempts
   - Single account
   - Normal IP address

---

## 🧪 Testing

### Create Test Data (Optional)

Run this in Supabase SQL Editor:

```sql
-- Create test login attempts
INSERT INTO public.login_attempts (email, device_hash, success, ip_address)
VALUES 
  ('test@example.com', 'device123', false, '192.168.1.100'),
  ('test@example.com', 'device123', false, '192.168.1.100'),
  ('test@example.com', 'device123', false, '192.168.1.100'),
  ('test@example.com', 'device123', false, '192.168.1.100'),
  ('test@example.com', 'device123', false, '192.168.1.100'),
  ('test@example.com', 'device123', false, '192.168.1.100');

-- Verify it appears
SELECT * FROM public.get_suspicious_logins(5);
```

### Clean Up Test Data

```sql
DELETE FROM public.login_attempts 
WHERE email = 'test@example.com';
```

---

## 🐛 Troubleshooting

### Issue: "No suspicious accounts found"

**Possible Causes:**
1. No failed login attempts in database
2. Threshold too high
3. RPC function not created

**Solutions:**
- Lower the threshold to 1
- Check if login_attempts table has data
- Re-run SQL migration

### Issue: "Only admins can view suspicious logins"

**Cause:** User is not an admin

**Solution:**
```sql
-- Check your role
SELECT role FROM public.admin_roles WHERE user_id = auth.uid();

-- Should return SuperAdmin, SupportAdmin, or ReadOnly
```

### Issue: "Function does not exist"

**Cause:** SQL migration not run

**Solution:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run `SUSPICIOUS_LOGINS_SETUP.sql`

---

## 📱 Desktop App Integration

To log login attempts from your desktop app:

```typescript
// After login attempt
await supabase.rpc('log_login_attempt', {
  p_email: email,
  p_device_hash: deviceHash,
  p_success: loginSuccessful,
  p_ip_address: userIpAddress
});
```

This will automatically track all login attempts for monitoring.

---

## 📊 Metrics to Track

Monitor these KPIs:

1. **Failed Login Rate**
   - Target: < 5% of total attempts
   - Alert if: > 10%

2. **Suspicious Accounts**
   - Target: < 5 per day
   - Alert if: > 20 per day

3. **Blocked IPs**
   - Track growth over time
   - Review monthly

4. **Response Time**
   - Target: Block within 1 hour of detection
   - Measure: Time from alert to action

---

## ✅ Success Criteria

The feature is working when:

✅ Page loads without errors
✅ Can see suspicious accounts (if any exist)
✅ Can view login history
✅ Can block IP addresses
✅ Search and filters work
✅ Stats display correctly
✅ Desktop app logs attempts

---

## 🎯 Next Steps

1. **Run the SQL migration** (see Step 1 above)
2. **Test the feature** in your admin panel
3. **Integrate with desktop app** to log login attempts
4. **Set up monitoring schedule** (daily/weekly)
5. **Train admins** on how to respond to alerts

---

## 📞 Need Help?

If you encounter issues:

1. Check this guide's troubleshooting section
2. Verify SQL migration ran successfully
3. Check Supabase logs for errors
4. Ensure you have admin role

---

**Status:** ✅ Ready to Use
**Setup Time:** 5 minutes
**Difficulty:** Easy

🎉 **You're all set! Start monitoring suspicious logins now.**
