# Cron Job Management Dashboard Component

## Overview

Complete React component example for managing cron jobs in the admin dashboard. This component integrates with the existing cron job API endpoints to provide on/off toggles and real-time status monitoring.

---

## React Component Implementation

### CronJobsManagement.tsx

```tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Play, 
  Square, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CronJob {
  name: string;
  schedule: string;
  description: string;
  type: string;
  methodName: string;
  nextRun: string;
  isEnabled: boolean;
}

interface CronJobState {
  [key: string]: boolean;
}

interface CronJobsManagementProps {
  apiUrl?: string;
}

export function CronJobsManagement({ apiUrl }: CronJobsManagementProps) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [states, setStates] = useState<CronJobState>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  // Fetch cron job schedules
  const fetchSchedules = async () => {
    try {
      const response = await fetch(`${apiUrl}/cron-jobs/schedules`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch schedules');
      
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cron job schedules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch current states
  const fetchStates = async () => {
    try {
      const response = await fetch(`${apiUrl}/cron-jobs/states`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch states');
      
      const data = await response.json();
      setStates(data);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  // Toggle job on/off
  const handleToggle = async (jobType: string, enabled: boolean) => {
    setToggling(jobType);
    
    try {
      const response = await fetch(`${apiUrl}/cron-jobs/${jobType}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) throw new Error('Failed to toggle job');

      const data = await response.json();
      
      toast({
        title: enabled ? 'Job Enabled' : 'Job Disabled',
        description: data.message,
        variant: 'default',
      });

      // Update state
      setStates(prev => ({ ...prev, [jobType]: enabled }));
      
      // Refresh to get updated schedules
      await fetchSchedules();
    } catch (error) {
      console.error('Error toggling job:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle cron job',
        variant: 'destructive',
      });
    } finally {
      setToggling(null);
    }
  };

  // Manually run a job
  const handleRunNow = async (jobType: string) => {
    setRunning(jobType);
    
    try {
      const response = await fetch(`${apiUrl}/cron-jobs/${jobType}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to run job');

      const data = await response.json();
      
      toast({
        title: data.success ? 'Job Started' : 'Job Failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Error running job:', error);
      toast({
        title: 'Error',
        description: 'Failed to run cron job',
        variant: 'destructive',
      });
    } finally {
      setRunning(null);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchStates();
    
    // Refresh states every 30 seconds
    const interval = setInterval(fetchStates, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cron Jobs</h2>
          <p className="text-muted-foreground">
            Manage automated background jobs
          </p>
        </div>
        <Button onClick={() => { fetchSchedules(); fetchStates(); }} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Changes take effect immediately. Disabled jobs will not execute until enabled.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => {
          const currentState = states[job.type] ?? job.isEnabled;
          const isToggling = toggling === job.type;
          const isRunning = running === job.type;

          return (
            <Card key={job.type} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{job.name}</CardTitle>
                    <CardDescription>{job.description}</CardDescription>
                  </div>
                  <Badge 
                    variant={currentState ? 'default' : 'secondary'}
                    className="shrink-0"
                  >
                    {currentState ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <Square className="h-3 w-3 mr-1" />
                    )}
                    {currentState ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Schedule Info */}
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="font-mono">{job.schedule}</span>
                </div>

                {/* Next Run */}
                <div className="text-sm">
                  <span className="text-muted-foreground">Next run: </span>
                  <span className="font-medium">
                    {format(new Date(job.nextRun), 'PPpp')}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Switch
                    checked={currentState}
                    onCheckedChange={(checked) => handleToggle(job.type, checked)}
                    disabled={isToggling}
                  />
                  <span className="text-sm flex-1">
                    {isToggling ? 'Updating...' : currentState ? 'Enabled' : 'Disabled'}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRunNow(job.type)}
                    disabled={isRunning || isToggling}
                  >
                    {isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Job Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-2xl font-bold">
                {jobs.filter(j => states[j.type] ?? j.isEnabled).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Active Jobs
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {jobs.filter(j => !(states[j.type] ?? j.isEnabled)).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Disabled Jobs
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">{jobs.length}</div>
              <div className="text-sm text-muted-foreground">
                Total Jobs
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Math.round((jobs.filter(j => states[j.type] ?? j.isEnabled).length / jobs.length) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Active Rate
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CronJobsManagement;
```

---

## API Integration

### Environment Configuration

```typescript
// src/config/environments.ts
export const API_ENDPOINTS = {
  development: 'http://localhost:3000',
  staging: 'https://staging-api.sf-middleware.com',
  production: 'https://api.sf-middleware.com',
};

export const getApiUrl = () => {
  return API_ENDPOINTS[process.env.NODE_ENV as keyof typeof API_ENDPOINTS] || API_ENDPOINTS.development;
};
```

### Custom Hook for Cron Jobs

```typescript
// src/hooks/useCronJobs.ts
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface CronJobData {
  name: string;
  schedule: string;
  description: string;
  type: string;
  methodName: string;
  nextRun: string;
  isEnabled: boolean;
}

export function useCronJobs() {
  const queryClient = useQueryClient();
  const apiUrl = getApiUrl();

  // Fetch schedules
  const schedulesQuery = useQuery({
    queryKey: ['cronJobs', 'schedules'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/cron-jobs/schedules`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch schedules');
      return response.json() as Promise<CronJobData[]>;
    },
  });

  // Fetch states
  const statesQuery = useQuery({
    queryKey: ['cronJobs', 'states'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/cron-jobs/states`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch states');
      return response.json() as Promise<Record<string, boolean>>;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ jobType, enabled }: { jobType: string; enabled: boolean }) => {
      const response = await fetch(`${apiUrl}/cron-jobs/${jobType}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error('Failed to toggle job');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['cronJobs']);
      toast({
        title: data.enabled ? 'Job Enabled' : 'Job Disabled',
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to toggle cron job',
        variant: 'destructive',
      });
    },
  });

  // Run mutation
  const runMutation = useMutation({
    mutationFn: async (jobType: string) => {
      const response = await fetch(`${apiUrl}/cron-jobs/${jobType}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to run job');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? 'Job Started' : 'Job Failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to run cron job',
        variant: 'destructive',
      });
    },
  });

  return {
    schedules: schedulesQuery.data || [],
    states: statesQuery.data || {},
    loading: schedulesQuery.isLoading || statesQuery.isLoading,
    error: schedulesQuery.error || statesQuery.error,
    toggleJob: (jobType: string, enabled: boolean) => toggleMutation.mutate({ jobType, enabled }),
    runJob: (jobType: string) => runMutation.mutate(jobType),
    isToggling: toggleMutation.isPending,
    isRunning: runMutation.isPending,
    refetch: () => {
      schedulesQuery.refetch();
      statesQuery.refetch();
    },
  };
}
```

---

## Usage in Dashboard

### Add to Navigation Menu

Update your navigation configuration in the dashboard:

```typescript
// src/components/layout/navigation.tsx
const menuItems = [
  // ... existing items
  {
    key: 'queue',
    label: 'Queue Management',
    icon: <Workflow className="h-4 w-4" />,
    children: [
      { key: 'overview', label: 'Queue Overview', icon: <Activity className="h-4 w-4" /> },
      { key: 'jobs', label: 'Job Details', icon: <FileText className="h-4 w-4" /> },
      { key: 'cron-jobs', label: 'Cron Jobs', icon: <Clock className="h-4 w-4" /> }, // Add this
      { key: 'monitoring', label: 'Real-time Monitor', icon: <Monitor className="h-4 w-4" /> },
    ],
  },
];
```

### Add to Routes

```typescript
// src/routes.tsx or similar routing file
import { CronJobsManagement } from '@/pages/cron-jobs/CronJobsManagement';

const routes = [
  // ... existing routes
  {
    path: '/queue/cron-jobs',
    element: <CronJobsManagement />,
  },
];
```

---

## UI Features

### Real-time State Updates
- Auto-refreshes every 30 seconds
- Manual refresh button
- Loading states while toggling

### Visual Indicators
- Badge for enabled/disabled
- Color coding (green for enabled, gray for disabled)
- Icons for quick status recognition

### Actions
- Switch to enable/disable jobs
- Play to manually run a job
- Refresh to reload data

### Statistics Summary
- Active vs disabled counts
- Total jobs
- Active rate

---

## API Endpoints Reference

All endpoints require JWT authentication:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cron-jobs/schedules` | GET | Get all cron job schedules and details |
| `/cron-jobs/states` | GET | Get enabled/disabled state for all jobs |
| `/cron-jobs/:type/state` | GET | Get state for specific job type |
| `/cron-jobs/:type/toggle` | PUT | Enable/disable a job |
| `/cron-jobs/:type/run` | POST | Manually trigger a job |

**Request Headers:**
```javascript
{
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

**Response Examples:**

Get Schedules:
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
  }
]
```

Get States:
```json
{
  "pledge": true,
  "oneoff": false,
  "recurring": true,
  "hourly": true
}
```

Toggle Job:
```json
{
  "success": true,
  "message": "Cron job pledge enabled",
  "jobType": "pledge",
  "enabled": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Testing

### Manual Testing Checklist

- [ ] Load cron jobs list
- [ ] Toggle jobs on/off
- [ ] Verify state persists
- [ ] Run jobs manually
- [ ] Check real-time refresh
- [ ] Test error handling
- [ ] Verify responsive layout
- [ ] Test in production vs staging

### Example cURL Commands

```bash
# Get all schedules
curl -X GET http://localhost:3000/cron-jobs/schedules \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get all states
curl -X GET http://localhost:3000/cron-jobs/states \
  -H "Authorization: Bearer YOUR_TOKEN"

# Disable pledge jobs
curl -X PUT http://localhost:3000/cron-jobs/pledge/toggle \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Enable oneoff jobs
curl -X PUT http://localhost:3000/cron-jobs/oneoff/toggle \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Run pledge jobs manually
curl -X POST http://localhost:3000/cron-jobs/pledge/run \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Security Considerations

1. **Authentication**: All endpoints require JWT
2. **Authorization**: Only ADMIN/SUPER_ADMIN can manage cron jobs
3. **Rate limiting**: Avoid rapid toggles
4. **Audit logging**: All cron job changes are logged
5. **Validation**: Server validates job types

---

## Future Enhancements

1. **Persistent state**: Store in database instead of memory
2. **Job history**: Show when jobs last ran
3. **Error tracking**: Track failures per job type
4. **Notifications**: Alert when jobs fail
5. **Bulk operations**: Toggle multiple jobs at once
6. **Schedule editor**: Allow changing cron expressions
7. **Execution logs**: Show detailed job execution logs

