# 💻 Multi-Device Login Monitoring - Quick Start

## ⚡ Setup (3 Steps)

### 1️⃣ Run SQL Migration
1. Open Supabase Dashboard → SQL Editor
2. Run contents of `MULTI_DEVICE_MONITORING_SETUP.sql`
3. Verify success ✅

### 2️⃣ Verify Installation
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'get_multi_device_logins';
```

### 3️⃣ Access Feature
Go to **http://localhost:5173/multi-device-logins**

---

## 🎯 Features

- **Concurrent Login Detection**: Finds users active on >2 devices in last 24h
- **Session Management**: View all active sessions for a user
- **Remote Termination**: Block specific devices/sessions
- **Account Suspension**: One-click suspend for policy violators

---

## 🔍 Understanding the Data

- **Active Device**: A device seen in the last 24 hours
- **Current Session**: The device currently holding the active session token
- **Device Count**: Number of unique devices used recently

---

## 🛡️ Best Practices

- **Threshold**: Start with 3+ devices for investigation
- **Termination**: Terminate unrecognized devices first
- **Suspension**: Only suspend for clear Terms of Service violations (e.g., account sharing)

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| No data shown | Ensure devices have `last_user_id` set |
| "Permission denied" | Check admin role |
| Function missing | Re-run SQL migration |

---
**Status:** ✅ Ready to Deployment
