# How to Test Cron Job Persistence

## 🧪 Quick Test

Test that your cron job settings persist across server restarts!

---

## Step 1: Start Server

```bash
npm run start:dev
```

Look for initialization log:
```
[CronJobStateService] Initialized default cron job settings in database
[CronJobStateService] Loaded 4 cron job states from database
```

---

## Step 2: Disable a Job

```bash
# Get JWT token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}' \
  | jq -r '.access_token')

# Disable pledge jobs
curl -X PUT http://localhost:3000/cron-jobs/pledge/toggle \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

**Response:**
```json
{
  "success": true,
  "message": "Cron job pledge disabled",
  "jobType": "pledge",
  "enabled": false
}
```

---

## Step 3: Verify in Database

```sql
SELECT key, value 
FROM "SystemSetting" 
WHERE category = 'cronJobs';
```

You should see:
```
key       | value
----------|-------
pledge    | false  ← Disabled!
oneoff    | true
recurring | true
hourly    | true
```

---

## Step 4: Restart Server

```bash
# Stop server (Ctrl+C)
# Start again
npm run start:dev
```

Look for:
```
[CronJobStateService] Loaded 4 cron job states from database
```

---

## Step 5: Check State After Restart

```bash
curl -X GET http://localhost:3000/cron-jobs/pledge/state \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "jobType": "pledge",
  "enabled": false  ← Still disabled!
}
```

✅ **Success!** Your setting survived the restart!

---

## Step 6: Verify Jobs Skip

Watch the logs. You should see:

```
Pledge jobs are disabled, skipping...
```

No pledge jobs will execute because they're disabled.

---

## Step 7: Re-enable

```bash
curl -X PUT http://localhost:3000/cron-jobs/pledge/toggle \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

Now you should see:
```
Scheduling pledge jobs...
Scheduled pledge jobs successfully...
```

---

## 🎉 Success!

Your cron job persistence is working! Settings are:
- ✅ Stored in database
- ✅ Loaded on startup
- ✅ Survive restarts
- ✅ Work in real-time

---
