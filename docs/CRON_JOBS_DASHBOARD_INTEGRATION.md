# Cron Jobs Dashboard Integration Guide

## ✅ Implementation Complete!

Your cron job management system is fully implemented and ready for dashboard integration.

---

## 📋 Backend API Endpoints Ready

All these endpoints are **already working** and ready to use:

### 1. Get Cron Job Schedules
```bash
GET /cron-jobs/schedules
```

**Returns:**
```json
[
  {
    "name": "Pledge Jobs",
    "schedule": "*/2 * * * *",
    "description": "Process pledge-related Salesforce operations",
    "type": "pledge",
    "methodName": "schedulePledgeJobs",
    "nextRun": "2024-01-15T15:02:00.000Z",
    "isEnabled": true
  },
  {
    "name": "One-off Jobs",
    "schedule": "*/2 * * * *",
    "description": "Process one-off Salesforce operations",
    "type": "oneoff",
    "methodName": "scheduleOneOffJobs",
    "nextRun": "2024-01-15T15:02:00.000Z",
    "isEnabled": true
  },
  {
    "name": "Recurring Jobs",
    "schedule": "0 */5 * * * *",
    "description": "Process recurring cleanup jobs",
    "type": "recurring",
    "methodName": "scheduleRecurringJobs",
    "nextRun": "2024-01-15T15:05:00.000Z",
    "isEnabled": true
  },
  {
    "name": "Hourly Jobs",
    "schedule": "0 0 * * * *",
    "description": "Process hourly reports and maintenance",
    "type": "hourly",
    "methodName": "scheduleHourlyJobs",
    "nextRun": "2024-01-15T16:00:00.000Z",
    "isEnabled": true
  }
]
```

### 2. Get All Job States
```bash
GET /cron-jobs/states
```

**Returns:**
```json
{
  "pledge": true,
  "oneoff": true,
  "recurring": true,
  "hourly": true
}
```

### 3. Get Single Job State
```bash
GET /cron-jobs/:type/state
```

**Returns:**
```json
{
  "jobType": "pledge",
  "enabled": true
}
```

### 4. Toggle Job On/Off
```bash
PUT /cron-jobs/:type/toggle
Content-Type: application/json
Body: { "enabled": false }
```

**Returns:**
```json
{
  "success": true,
  "message": "Cron job pledge disabled",
  "jobType": "pledge",
  "enabled": false,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 5. Manually Run Job
```bash
POST /cron-jobs/:type/run
```

**Returns:**
```json
{
  "success": true,
  "message": "Cron job pledge execution triggered successfully",
  "jobType": "pledge",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🎨 Dashboard Component Ready

Complete React component with all features implemented:

**File**: `docs/CRON_JOB_DASHBOARD_COMPONENT.md`

**Features:**
- ✅ Real-time state display
- ✅ Toggle switch for on/off
- ✅ Manual run button
- ✅ Auto-refresh every 30 seconds
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ Statistics summary
- ✅ Responsive grid layout

---

## 🚀 Quick Integration Steps

### Option 1: Use the Provided Component (Easiest)

1. **Copy the component** from `CRON_JOB_DASHBOARD_COMPONENT.md`
2. **Add to your dashboard routes**:
   ```tsx
   import { CronJobsManagement } from '@/pages/cron-jobs/CronJobsManagement';
   
   <Route path="/queue/cron-jobs" element={<CronJobsManagement />} />
   ```
3. **Add to navigation menu**:
   ```tsx
   { key: 'cron-jobs', label: 'Cron Jobs', icon: <Clock className="h-4 w-4" /> }
   ```
4. **Done!** Your dashboard now has full cron job management.

### Option 2: Custom Implementation

Use the provided hooks and API examples to build your own UI.

---

## 📦 Required Dependencies (Already in Dashboard Spec)

Your dashboard already includes these in the spec:

```json
{
  "@tanstack/react-query": "^4.24.0",
  "date-fns": "^2.30.0",
  "sonner": "^1.2.0",
  "@radix-ui/react-switch": "^1.0.3"
}
```

Just make sure you have the Switch component from shadcn/ui:
```bash
npx shadcn-ui@latest add switch skeleton alert
```

---

## 🔑 Authentication

All endpoints require JWT authentication:

```javascript
headers: {
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
}
```

---

## 🎯 How It Works

### State Management
1. **In-Memory State**: `CronJobStateService` tracks enabled/disabled
2. **Real Integration**: Jobs in `JobSchedulerService` check state before running
3. **Persistence**: State kept in memory (can be moved to database later)

### Job Execution
1. **Scheduled**: Jobs run on their cron schedule
2. **Check State**: Each run checks if job is enabled
3. **Skip if Disabled**: Disabled jobs log and skip gracefully
4. **Manual Override**: Manual run bypasses scheduled time

### Real-Time Updates
1. **Polling**: Frontend polls `/cron-jobs/states` every 30s
2. **Immediate**: Manual toggles show instant UI updates
3. **Consistent**: Backend and frontend states stay in sync

---

## 📊 Example UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Cron Jobs                              [Refresh]           │
├─────────────────────────────────────────────────────────────┤
│  ⚠️  Changes take effect immediately                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Pledge Jobs │  │ One-off Jobs│  │ Recurring   │        │
│  │    [✓] ON   │  │   [ ] OFF   │  │    [✓] ON   │        │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤        │
│  │ */2 * * * * │  │ */2 * * * * │  │ 0 */5 * * * │        │
│  │ Next: 3:02  │  │ Next: 3:02  │  │ Next: 3:05  │        │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤        │
│  │ [Toggle] [▶]│  │ [Toggle] [▶]│  │ [Toggle] [▶]│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  Statistics                                                 │
│  3 Active | 1 Disabled | 4 Total | 75% Active Rate         │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Testing Checklist

### Backend Tests
```bash
# Test all endpoints
curl -X GET http://localhost:3000/cron-jobs/schedules -H "Authorization: Bearer TOKEN"
curl -X GET http://localhost:3000/cron-jobs/states -H "Authorization: Bearer TOKEN"
curl -X PUT http://localhost:3000/cron-jobs/pledge/toggle -H "Authorization: Bearer TOKEN" -d '{"enabled":false}'
curl -X POST http://localhost:3000/cron-jobs/pledge/run -H "Authorization: Bearer TOKEN"
```

### Frontend Tests
- [ ] Load cron jobs list
- [ ] Toggle jobs on/off
- [ ] State updates immediately
- [ ] Run jobs manually
- [ ] Auto-refresh works
- [ ] Error handling works
- [ ] Mobile responsive

---

## 🎉 You're Ready!

Your cron job management system is:
- ✅ **Fully integrated** with real job scheduler
- ✅ **Fully controllable** via REST API
- ✅ **Ready for dashboard** integration
- ✅ **Real-time** state management
- ✅ **Production ready** with error handling

Just add the React component to your dashboard and you're done!

**Next Step**: Copy the component from `docs/CRON_JOB_DASHBOARD_COMPONENT.md` into your dashboard project and connect it to your routing.
