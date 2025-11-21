# Queue Module

This module handles all queue-related functionality using BullMQ and Redis.

## Directory Structure

```
queue/
├── controllers/          # REST API controllers for queue management
│   ├── job-management.controller.ts    # Job CRUD operations
│   └── queue-monitor.controller.ts     # Queue monitoring endpoints
├── interfaces/          # Queue-specific TypeScript interfaces
│   └── salesforce-processor.interface.ts
├── processors/           # BullMQ job processors (workers)
│   ├── salesforce.processor.ts   # Processes Salesforce API jobs
│   ├── email.processor.ts        # Processes email jobs
│   └── notification.processor.ts # Processes notification jobs
├── services/            # Business logic services
│   ├── queue.service.ts              # Main queue service
│   ├── job-scheduler.service.ts      # Job scheduling logic
│   ├── queue-monitor.service.ts      # Queue monitoring
│   ├── batch-processor.service.ts    # Batch processing utilities
│   └── performance-monitor.service.ts # Performance metrics
└── queue.module.ts      # NestJS module definition
```

## Type Definitions

All queue-related types are centralized in `src/types/queue.types.ts`:
- `SalesforceJobData` - Data structure for Salesforce jobs
- `EmailJobData` - Data structure for email jobs
- `NotificationJobData` - Data structure for notification jobs
- `JobOptions` - Job configuration options
- `SalesforceJob`, `EmailJob`, `NotificationJob` - Typed Job instances

## Queues

The module registers three queues:

1. **salesforce** - High-performance queue for Salesforce API calls
   - High volume configuration (450k+ requests/day)
   - Fast retry strategy
   - Processor: `SalesforceProcessor`

2. **email** - Queue for email sending
   - Standard configuration
   - Processor: `EmailProcessor`

3. **notifications** - Queue for push/SMS/webhook notifications
   - Standard configuration
   - Processor: `NotificationProcessor`

## Usage

### Adding Jobs

```typescript
import { QueueService } from './queue/services/queue.service';

// Add Salesforce job
await queueService.addSalesforceJob(data, options);

// Add Email job
await queueService.addEmailJob(data, options);

// Add Notification job
await queueService.addNotificationJob(data, options);
```

### Monitoring

Use the `QueueMonitorService` or `QueueMonitorController` endpoints to monitor queue health and statistics.

## Best Practices

1. **Types**: Always use types from `src/types/queue.types.ts` instead of defining duplicates
2. **Logging**: Use NestJS `Logger` instead of `console.log`
3. **Error Handling**: Processors should handle errors gracefully and log appropriately
4. **Performance**: Use batch processing for high-volume operations

