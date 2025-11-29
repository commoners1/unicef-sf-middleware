# Cron Job State Persistence

## ✅ Problem Solved

**Issue**: Cron job enabled/disabled state was lost on server restart (only stored in memory)

**Solution**: Implemented persistent storage in database using `SystemSetting` table

---

## 🗄️ How It Works

### Storage Location
- **Table**: `SystemSetting`
- **Category**: `cronJobs`
- **Keys**: `pledge`, `oneoff`, `recurring`, `hourly`
- **Value Type**: `boolean`

### Database Schema
```sql
SELECT * FROM "SystemSetting" WHERE category = 'cronJobs';

-- Results:
id                | category  | key       | value | valueType
------------------|-----------|-----------|-------|----------
clx123...         | cronJobs  | pledge    | true  | boolean
clx456...         | cronJobs  | oneoff    | false | boolean
clx789...         | cronJobs  | recurring | true  | boolean
clxabc...         | cronJobs  | hourly    | true  | boolean
```

---

## 🔄 Lifecycle

### Startup (onModuleInit)
1. Load states from database
2. If none exist → create default settings (all enabled)
3. Load into memory for fast access
4. Log success/failure

### During Runtime
- States checked from in-memory (fast)
- Changes persisted to database immediately
- Database serves as source of truth

### Shutdown & Restart
- Memory cleared
- On next startup → reload from database
- Your settings are preserved!

---

## 📊 Features

### ✅ Persistence
- Settings survive server restarts
- Database is source of truth
- Auto-initialization on first run

### ✅ Performance
- In-memory cache for speed
- Database write on change only
- Fast reads during runtime

### ✅ Reliability
- Fallback to defaults if database fails
- Graceful error handling
- Continues working even if DB is down (memory only)

### ✅ Auto-initialization
- Creates default settings on first run
- All jobs start enabled by default
- No manual setup required

---

## 🔍 Example Flow

### First Server Start
```
1. Load from DB → No records found
2. Create defaults → All enabled
3. Store in DB
4. Load into memory
✅ Ready!
```

### Disable Pledge Jobs
```
1. User toggles pledge job to OFF
2. Update memory: pledge = false
3. Persist to DB: UPSERT SystemSetting
4. Log: "Cron job pledge disabled"
✅ Saved!
```

### Server Restart
```
1. Load from DB → Loads pledge = false
2. Load into memory
3. Pledge jobs skip execution
✅ Settings preserved!
```

### Re-enable Pledge Jobs
```
1. User toggles pledge job to ON
2. Update memory: pledge = true
3. Persist to DB: UPSERT SystemSetting
4. Next scheduled run → Job executes
✅ Back online!
```

---

## 🎯 Code Changes

### CronJobStateService
```typescript
// Before: In-memory only
private jobStates = new Map([...]);

// After: Persistent with DB
async onModuleInit() {
  await this.loadStatesFromDatabase();
}

async setJobEnabled(jobType: string, enabled: boolean) {
  // Memory + Database
  this.jobStates.set(jobType, enabled);
  await this.prisma.systemSetting.upsert({...});
}
```

---

## 📋 Database Queries

### Check Current States
```sql
SELECT key, value 
FROM "SystemSetting" 
WHERE category = 'cronJobs';

-- Output:
key       | value
----------|-------
pledge    | true
oneoff    | false
recurring | true
hourly    | true
```

### Manually Update State
```sql
UPDATE "SystemSetting" 
SET value = 'false', "updatedAt" = NOW()
WHERE category = 'cronJobs' AND key = 'pledge';
```

### Reset to Defaults
```sql
UPDATE "SystemSetting" 
SET value = 'true', "updatedAt" = NOW()
WHERE category = 'cronJobs';
```

---

## ✅ Verification

Test the persistence:

1. **Start server**: All jobs enabled by default
2. **Disable a job**: Use API or dashboard
3. **Restart server**: `npm run start:dev`
4. **Check**: Job remains disabled ✅

---

## 🎉 Summary

**Problem**: Settings lost on restart ❌  
**Solution**: Database persistence ✅  
**Result**: Your on/off settings survive restarts! 🎉
