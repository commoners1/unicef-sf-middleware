# Admin Dashboard Specification - Salesforce Middleware

Complete specification for building a professional admin dashboard for the Salesforce Middleware API, similar to Midtrans or Xendit dashboards.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Environment Management](#environment-management)
4. [Dashboard Features](#dashboard-features)
5. [User Interface Design](#user-interface-design)
6. [API Integration](#api-integration)
7. [Security & Authentication](#security--authentication)
8. [Real-time Features](#real-time-features)
9. [Data Management](#data-management)
10. [Implementation Phases](#implementation-phases)
11. [Technical Requirements](#technical-requirements)

---

## 🎯 Overview

### Purpose
Build a comprehensive admin dashboard that provides:
- **API Management** - Monitor, configure, and manage API usage
- **Environment Switching** - Seamlessly switch between staging and production
- **Real-time Monitoring** - Live logs, metrics, and health status
- **User Management** - Manage users, API keys, and permissions
- **Analytics & Reporting** - Detailed insights and performance metrics

### Target Users
- **API Administrators** - Manage API configuration and monitor health
- **Developers** - Debug issues, view logs, and test API calls
- **Business Users** - View analytics, reports, and usage statistics
- **Support Team** - Troubleshoot issues and assist users

### Key Differentiators
- **Environment Toggle** - Like Midtrans/Xendit, switch between staging/production
- **Real-time Monitoring** - Live dashboard with WebSocket updates
- **Comprehensive Logging** - Detailed audit trails and error tracking
- **Queue Management** - Monitor and manage background job processing
- **Custom Analytics** - Business-specific metrics and reporting

---

## 🏗️ Architecture & Tech Stack

### Frontend Stack
```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard                          │
├─────────────────────────────────────────────────────────────┤
│ React 18 + TypeScript + Vite                               │
│ ├── UI Framework: shadcn/ui + Radix UI                     │
│ ├── State Management: Zustand + React Query                │
│ ├── Charts: Recharts + ECharts                             │
│ ├── Real-time: Socket.io Client                            │
│ ├── Routing: React Router v6                               │
│ ├── Styling: Tailwind CSS + CSS Variables                  │
│ └── Build Tool: Vite                                       │
└─────────────────────────────────────────────────────────────┘
```

### Backend Integration
```
┌─────────────────────────────────────────────────────────────┐
│                NestJS API (Existing)                       │
├─────────────────────────────────────────────────────────────┤
│ ├── Authentication: JWT + API Key                          │
│ ├── Database: PostgreSQL + Prisma                          │
│ ├── Queue: BullMQ + Redis                                  │
│ ├── Logging: Pino + Audit Service                          │
│ ├── Monitoring: Prometheus + Custom Metrics                │
│ └── WebSocket: Socket.io Server                            │
└─────────────────────────────────────────────────────────────┘
```

### Environment Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Environment Toggle                      │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│ │   Staging   │    │ Production  │    │  Development│      │
│ │             │    │             │    │             │      │
│ │ API:        │    │ API:        │    │ API:        │      │
│ │ staging-api │    │ prod-api    │    │ localhost   │      │
│ │ .com        │    │ .com        │    │ :3000       │      │
│ └─────────────┘    └─────────────┘    └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Environment Management

### Environment Configuration
```typescript
interface EnvironmentConfig {
  id: string;
  name: string;
  apiUrl: string;
  wsUrl: string;
  isProduction: boolean;
  features: {
    realTimeLogs: boolean;
    advancedAnalytics: boolean;
    queueManagement: boolean;
  };
  limits: {
    maxApiCalls: number;
    maxUsers: number;
    retentionDays: number;
  };
}

const environments: EnvironmentConfig[] = [
  {
    id: 'staging',
    name: 'Staging Environment',
    apiUrl: 'https://staging-api.sf-middleware.com',
    wsUrl: 'wss://staging-api.sf-middleware.com',
    isProduction: false,
    features: {
      realTimeLogs: true,
      advancedAnalytics: true,
      queueManagement: true,
    },
    limits: {
      maxApiCalls: 10000,
      maxUsers: 50,
      retentionDays: 30,
    },
  },
  {
    id: 'production',
    name: 'Production Environment',
    apiUrl: 'https://api.sf-middleware.com',
    wsUrl: 'wss://api.sf-middleware.com',
    isProduction: true,
    features: {
      realTimeLogs: true,
      advancedAnalytics: true,
      queueManagement: true,
    },
    limits: {
      maxApiCalls: 1000000,
      maxUsers: 1000,
      retentionDays: 365,
    },
  },
];
```

### Environment Switching UI
```tsx
const EnvironmentSelector = () => {
  const { currentEnv, switchEnvironment } = useEnvironment();
  
  return (
    <Select
      value={currentEnv.id}
      onChange={switchEnvironment}
      style={{ minWidth: 200 }}
    >
      {environments.map(env => (
        <Option key={env.id} value={env.id}>
          <Space>
            <Badge 
              status={env.isProduction ? 'success' : 'processing'} 
              text={env.name}
            />
            <Tag color={env.isProduction ? 'red' : 'blue'}>
              {env.isProduction ? 'PROD' : 'STAGING'}
            </Tag>
          </Space>
        </Option>
      ))}
    </Select>
  );
};
```

---

## 📊 Dashboard Features

### 1. Overview Dashboard
**Purpose**: High-level system health and key metrics

**Components**:
- **System Status Cards**
  - API Health (Green/Yellow/Red)
  - Queue Status (Active/Idle/Error)
  - Database Status (Connected/Disconnected)
  - Redis Status (Connected/Disconnected)

- **Key Metrics**
  - Total API Calls (Today/Week/Month)
  - Success Rate (%)
  - Average Response Time (ms)
  - Active Users
  - Queue Depth

- **Real-time Charts**
  - API Calls per Minute (Line Chart)
  - Response Time Distribution (Histogram)
  - Error Rate Trend (Area Chart)
  - Queue Processing Rate (Bar Chart)

### 2. API Management
**Purpose**: Monitor and manage API endpoints

**Features**:
- **Endpoint Status**
  - Live endpoint health monitoring
  - Response time tracking
  - Error rate monitoring
  - Rate limiting status

- **API Usage Analytics**
  - Calls per endpoint
  - Peak usage times
  - Geographic distribution
  - User agent analysis

- **Configuration Management**
  - Rate limit settings
  - Timeout configurations
  - Retry policies
  - Circuit breaker settings

### 3. Queue Management
**Purpose**: Monitor and manage background job processing

**Features**:
- **Queue Overview**
  - Queue sizes (Salesforce, Email, Notifications)
  - Processing rates
  - Failed job counts
  - Retry attempts

- **Job Details**
  - Job status (Queued/Processing/Completed/Failed)
  - Processing time
  - Error messages
  - Retry history

- **Queue Controls**
  - Pause/Resume queues
  - Retry failed jobs
  - Clear completed jobs
  - Bulk job operations

### 4. User Management
**Purpose**: Manage users, API keys, and permissions

**Features**:
- **User List**
  - User details (Name, Email, Company)
  - Account status (Active/Inactive)
  - Last login
  - API key count

- **API Key Management**
  - Generate new keys
  - Revoke keys
  - Permission management
  - Usage tracking per key

- **Permission System**
  - Role-based access control
  - Feature-level permissions
  - Environment access control

### 5. Audit & Logging
**Purpose**: Comprehensive logging and audit trail

**Features**:
- **Live Log Stream**
  - Real-time log viewing
  - Log level filtering (INFO, WARN, ERROR)
  - Search and filter capabilities
  - Log export functionality

- **Audit Trail**
  - User actions
  - API key usage
  - Configuration changes
  - Security events

- **Error Tracking**
  - Error aggregation
  - Stack trace analysis
  - Error frequency
  - Resolution tracking

### 6. Analytics & Reporting
**Purpose**: Business intelligence and performance insights

**Features**:
- **Performance Metrics**
  - Response time percentiles
  - Throughput analysis
  - Error rate trends
  - Resource utilization

- **Business Analytics**
  - API usage by customer
  - Revenue metrics
  - Growth trends
  - Geographic analysis

- **Custom Reports**
  - Scheduled reports
  - Custom date ranges
  - Export options (PDF, CSV, Excel)
  - Email notifications

---

## 🎨 User Interface Design

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo | Environment Selector | User Menu | Notifications │
├─────────────────────────────────────────────────────────────┤
│ Sidebar: Navigation Menu (Collapsible)                      │
├─────────────────────────────────────────────────────────────┤
│ Main Content: Dashboard Pages                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Breadcrumb Navigation                                  │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Page Content with Cards, Charts, Tables                │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Menu
```typescript
import { 
  LayoutDashboard, 
  Api, 
  Workflow, 
  Users, 
  FileText, 
  BarChart3, 
  Settings,
  Activity,
  Key,
  Shield,
  Monitor,
  AlertTriangle,
  TrendingUp,
  Bell,
  Integration
} from 'lucide-react';

const menuItems = [
  {
    key: 'overview',
    label: 'Overview',
    icon: <LayoutDashboard className="h-4 w-4" />,
    children: [
      { key: 'dashboard', label: 'Dashboard', icon: <Activity className="h-4 w-4" /> },
      { key: 'metrics', label: 'Key Metrics', icon: <TrendingUp className="h-4 w-4" /> },
    ],
  },
  {
    key: 'api',
    label: 'API Management',
    icon: <Api className="h-4 w-4" />,
    children: [
      { key: 'endpoints', label: 'Endpoints', icon: <Monitor className="h-4 w-4" /> },
      { key: 'usage', label: 'Usage Analytics', icon: <BarChart3 className="h-4 w-4" /> },
      { key: 'config', label: 'Configuration', icon: <Settings className="h-4 w-4" /> },
    ],
  },
  {
    key: 'queue',
    label: 'Queue Management',
    icon: <Workflow className="h-4 w-4" />,
    children: [
      { key: 'overview', label: 'Queue Overview', icon: <Activity className="h-4 w-4" /> },
      { key: 'jobs', label: 'Job Details', icon: <FileText className="h-4 w-4" /> },
      { key: 'monitoring', label: 'Real-time Monitor', icon: <Monitor className="h-4 w-4" /> },
    ],
  },
  {
    key: 'users',
    label: 'User Management',
    icon: <Users className="h-4 w-4" />,
    children: [
      { key: 'list', label: 'Users', icon: <Users className="h-4 w-4" /> },
      { key: 'apikeys', label: 'API Keys', icon: <Key className="h-4 w-4" /> },
      { key: 'permissions', label: 'Permissions', icon: <Shield className="h-4 w-4" /> },
    ],
  },
  {
    key: 'logs',
    label: 'Logs & Audit',
    icon: <FileText className="h-4 w-4" />,
    children: [
      { key: 'live', label: 'Live Logs', icon: <Monitor className="h-4 w-4" /> },
      { key: 'audit', label: 'Audit Trail', icon: <FileText className="h-4 w-4" /> },
      { key: 'errors', label: 'Error Tracking', icon: <AlertTriangle className="h-4 w-4" /> },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    children: [
      { key: 'performance', label: 'Performance', icon: <TrendingUp className="h-4 w-4" /> },
      { key: 'business', label: 'Business Metrics', icon: <BarChart3 className="h-4 w-4" /> },
      { key: 'reports', label: 'Reports', icon: <FileText className="h-4 w-4" /> },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: <Settings className="h-4 w-4" />,
    children: [
      { key: 'general', label: 'General', icon: <Settings className="h-4 w-4" /> },
      { key: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
      { key: 'integrations', label: 'Integrations', icon: <Integration className="h-4 w-4" /> },
    ],
  },
];
```

### Color Scheme & Theming
```typescript
// CSS Variables for theming (globals.css)
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
  
  // Custom dashboard colors
  --success: 142 76% 36%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 100%;
  --error: 0 84% 60%;
  --error-foreground: 0 0% 100%;
  --info: 221.2 83.2% 53.3%;
  --info-foreground: 0 0% 100%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 84% 4.9%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 94.1%;
}
```

---

## 🎨 shadcn/ui Component Examples

### Basic Setup
```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Add essential components
npx shadcn-ui@latest add button card input table select dialog dropdown-menu tabs toast
npx shadcn-ui@latest add badge avatar separator skeleton progress alert-dialog
npx shadcn-ui@latest add command popover sheet sidebar navigation-menu
```

### Dashboard Layout Components
```tsx
// components/layout/sidebar.tsx
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  LayoutDashboard, 
  Api, 
  Workflow, 
  Users, 
  FileText, 
  BarChart3, 
  Settings 
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <div className={cn('pb-12', className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Dashboard
          </h2>
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Overview
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Api className="mr-2 h-4 w-4" />
              API Management
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Workflow className="mr-2 h-4 w-4" />
              Queue Management
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              User Management
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Logs & Audit
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
          </div>
        </div>
        <Separator />
        <div className="px-3 py-2">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Metrics Cards
```tsx
// components/dashboard/metrics-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  description?: string;
  icon?: React.ReactNode;
}

export function MetricsCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  description,
  icon 
}: MetricsCardProps) {
  const getTrendIcon = () => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-500';
      case 'decrease':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center space-x-1 text-xs">
            {getTrendIcon()}
            <span className={getTrendColor()}>
              {change > 0 ? '+' : ''}{change}%
            </span>
            <span className="text-muted-foreground">from last period</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

### Data Tables
```tsx
// components/tables/users-table.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  isActive: boolean;
  createdAt: string;
}

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export function UsersTable({ users, onEdit, onDelete }: UsersTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.company || '-'}</TableCell>
              <TableCell>
                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(user)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Environment Selector
```tsx
// components/environment-selector.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown, Server } from 'lucide-react';

interface Environment {
  id: string;
  name: string;
  url: string;
  isProduction: boolean;
}

interface EnvironmentSelectorProps {
  environments: Environment[];
  currentEnvironment: Environment;
  onEnvironmentChange: (env: Environment) => void;
}

export function EnvironmentSelector({
  environments,
  currentEnvironment,
  onEnvironmentChange,
}: EnvironmentSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          <div className="flex items-center space-x-2">
            <Server className="h-4 w-4" />
            <span>{currentEnvironment.name}</span>
            <Badge 
              variant={currentEnvironment.isProduction ? 'destructive' : 'secondary'}
            >
              {currentEnvironment.isProduction ? 'PROD' : 'STAGING'}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        {environments.map((env) => (
          <DropdownMenuItem
            key={env.id}
            onClick={() => onEnvironmentChange(env)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <Server className="h-4 w-4" />
              <span>{env.name}</span>
            </div>
            {currentEnvironment.id === env.id && (
              <Check className="h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Live Log Stream
```tsx
// components/logs/live-log-stream.tsx
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, Download } from 'lucide-react';

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  source: string;
}

interface LiveLogStreamProps {
  logs: LogEntry[];
  isConnected: boolean;
}

export function LiveLogStream({ logs, isConnected }: LiveLogStreamProps) {
  const [filter, setFilter] = useState({
    level: 'all',
    search: '',
  });

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filter.level !== 'all' && log.level !== filter.level) return false;
      if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    });
  }, [logs, filter]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'info':
        return 'default';
      case 'debug':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <span>Live Log Stream</span>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
        <div className="flex space-x-2">
          <Input
            placeholder="Search logs..."
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            className="max-w-sm"
          />
          <Select
            value={filter.level}
            onValueChange={(value) => setFilter(prev => ({ ...prev, level: value }))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50"
              >
                <Badge variant={getLevelColor(log.level)} className="mt-0.5">
                  {log.level.toUpperCase()}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{log.source}</span>
                  </div>
                  <p className="text-sm font-mono mt-1 break-all">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

---

## 🔌 API Integration

### Backend Endpoints (New)
```typescript
// Dashboard-specific endpoints to add to existing NestJS API

@Controller('dashboard')
export class DashboardController {
  // System Health
  @Get('health')
  async getSystemHealth() {
    return {
      api: await this.healthService.checkApi(),
      database: await this.healthService.checkDatabase(),
      redis: await this.healthService.checkRedis(),
      queue: await this.healthService.checkQueue(),
    };
  }

  // Real-time Metrics
  @Get('metrics')
  async getMetrics(@Query() query: MetricsQueryDto) {
    return {
      apiCalls: await this.metricsService.getApiCalls(query),
      responseTime: await this.metricsService.getResponseTime(query),
      errorRate: await this.metricsService.getErrorRate(query),
      queueStatus: await this.metricsService.getQueueStatus(query),
    };
  }

  // Queue Management
  @Get('queue/status')
  async getQueueStatus() {
    return {
      salesforce: await this.queueService.getQueueStatus('salesforce'),
      email: await this.queueService.getQueueStatus('email'),
      notifications: await this.queueService.getQueueStatus('notifications'),
    };
  }

  @Post('queue/pause')
  async pauseQueue(@Body() body: { queueName: string }) {
    return this.queueService.pauseQueue(body.queueName);
  }

  @Post('queue/resume')
  async resumeQueue(@Body() body: { queueName: string }) {
    return this.queueService.resumeQueue(body.queueName);
  }

  // User Management
  @Get('users')
  async getUsers(@Query() query: UserQueryDto) {
    return this.userService.getUsers(query);
  }

  @Post('users/:id/activate')
  async activateUser(@Param('id') id: string) {
    return this.userService.activateUser(id);
  }

  @Post('users/:id/deactivate')
  async deactivateUser(@Param('id') id: string) {
    return this.userService.deactivateUser(id);
  }

  // API Key Management
  @Get('apikeys')
  async getApiKeys(@Query() query: ApiKeyQueryDto) {
    return this.apiKeyService.getApiKeys(query);
  }

  @Post('apikeys/:id/revoke')
  async revokeApiKey(@Param('id') id: string) {
    return this.apiKeyService.revokeApiKey(id);
  }

  // Live Logs
  @Get('logs/live')
  async getLiveLogs(@Query() query: LogQueryDto) {
    return this.auditService.getLiveLogs(query);
  }

  // Analytics
  @Get('analytics/performance')
  async getPerformanceAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getPerformanceMetrics(query);
  }

  @Get('analytics/business')
  async getBusinessAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getBusinessMetrics(query);
  }
}
```

### WebSocket Events
```typescript
// Real-time events for dashboard updates
interface DashboardEvents {
  // System Health
  'system:health:update': {
    api: HealthStatus;
    database: HealthStatus;
    redis: HealthStatus;
    queue: HealthStatus;
  };

  // Metrics
  'metrics:update': {
    timestamp: string;
    apiCalls: number;
    responseTime: number;
    errorRate: number;
    queueDepth: number;
  };

  // Queue Events
  'queue:job:completed': {
    queueName: string;
    jobId: string;
    duration: number;
    result: any;
  };

  'queue:job:failed': {
    queueName: string;
    jobId: string;
    error: string;
    retryCount: number;
  };

  // Log Events
  'log:new': {
    level: 'info' | 'warn' | 'error';
    message: string;
    timestamp: string;
    source: string;
  };

  // User Events
  'user:login': {
    userId: string;
    email: string;
    ipAddress: string;
    timestamp: string;
  };

  'user:logout': {
    userId: string;
    timestamp: string;
  };
}
```

---

## 🔐 Security & Authentication

### Authentication Flow
```typescript
// Multi-level authentication system
interface AuthConfig {
  // JWT for dashboard access
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  
  // API Key for API access (existing)
  apiKey: {
    prefix: 'sk_';
    length: 32;
    permissions: string[];
  };
  
  // Session management
  session: {
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
  };
}
```

### Permission System
```typescript
interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

const permissions: Permission[] = [
  // Dashboard Access
  { id: 'dashboard:view', name: 'View Dashboard', resource: 'dashboard', action: 'read' },
  { id: 'dashboard:admin', name: 'Admin Dashboard', resource: 'dashboard', action: 'admin' },
  
  // API Management
  { id: 'api:view', name: 'View API', resource: 'api', action: 'read' },
  { id: 'api:manage', name: 'Manage API', resource: 'api', action: 'write' },
  { id: 'api:config', name: 'Configure API', resource: 'api', action: 'admin' },
  
  // Queue Management
  { id: 'queue:view', name: 'View Queue', resource: 'queue', action: 'read' },
  { id: 'queue:manage', name: 'Manage Queue', resource: 'queue', action: 'write' },
  { id: 'queue:control', name: 'Control Queue', resource: 'queue', action: 'admin' },
  
  // User Management
  { id: 'users:view', name: 'View Users', resource: 'users', action: 'read' },
  { id: 'users:manage', name: 'Manage Users', resource: 'users', action: 'write' },
  { id: 'users:admin', name: 'Admin Users', resource: 'users', action: 'admin' },
  
  // Logs & Audit
  { id: 'logs:view', name: 'View Logs', resource: 'logs', action: 'read' },
  { id: 'logs:export', name: 'Export Logs', resource: 'logs', action: 'write' },
  { id: 'logs:admin', name: 'Admin Logs', resource: 'logs', action: 'admin' },
  
  // Analytics
  { id: 'analytics:view', name: 'View Analytics', resource: 'analytics', action: 'read' },
  { id: 'analytics:export', name: 'Export Analytics', resource: 'analytics', action: 'write' },
  { id: 'analytics:admin', name: 'Admin Analytics', resource: 'analytics', action: 'admin' },
];

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

const roles: Role[] = [
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to dashboard',
    permissions: ['dashboard:view', 'api:view', 'queue:view', 'logs:view', 'analytics:view'],
    isSystem: true,
  },
  {
    id: 'operator',
    name: 'Operator',
    description: 'Manage queues and monitor system',
    permissions: [
      'dashboard:view', 'api:view', 'queue:view', 'queue:manage',
      'logs:view', 'analytics:view', 'users:view'
    ],
    isSystem: true,
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access to all features',
    permissions: permissions.map(p => p.id),
    isSystem: true,
  },
];
```

---

## ⚡ Real-time Features

### WebSocket Integration
```typescript
// Real-time dashboard updates
const useRealtimeDashboard = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);

  useEffect(() => {
    const newSocket = io(wsUrl, {
      auth: {
        token: localStorage.getItem('jwt_token'),
      },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to dashboard WebSocket');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from dashboard WebSocket');
    });

    // Listen for real-time updates
    newSocket.on('metrics:update', (data) => {
      setMetrics(data);
    });

    newSocket.on('log:new', (log) => {
      setLogs(prev => [log, ...prev.slice(0, 999)]); // Keep last 1000 logs
    });

    newSocket.on('queue:status:update', (status) => {
      setQueueStatus(status);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [wsUrl]);

  return {
    socket,
    isConnected,
    metrics,
    logs,
    queueStatus,
  };
};
```

### Live Log Stream
```tsx
const LiveLogStream = () => {
  const { logs, isConnected } = useRealtimeDashboard();
  const [filter, setFilter] = useState({
    level: 'all',
    search: '',
  });

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filter.level !== 'all' && log.level !== filter.level) return false;
      if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    });
  }, [logs, filter]);

  return (
    <Card
      title="Live Log Stream"
      extra={
        <Space>
          <Badge status={isConnected ? 'success' : 'error'} text={isConnected ? 'Connected' : 'Disconnected'} />
          <Select
            value={filter.level}
            onChange={(value) => setFilter(prev => ({ ...prev, level: value }))}
            style={{ width: 100 }}
          >
            <Option value="all">All</Option>
            <Option value="info">Info</Option>
            <Option value="warn">Warn</Option>
            <Option value="error">Error</Option>
          </Select>
        </Space>
      }
    >
      <div style={{ height: 400, overflow: 'auto' }}>
        {filteredLogs.map((log, index) => (
          <div
            key={index}
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid #f0f0f0',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
          >
            <Space>
              <Tag color={log.level === 'error' ? 'red' : log.level === 'warn' ? 'orange' : 'blue'}>
                {log.level.toUpperCase()}
              </Tag>
              <span style={{ color: '#666' }}>{log.timestamp}</span>
              <span>{log.message}</span>
            </Space>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

---

## 📊 Data Management

### State Management Architecture
```typescript
// Zustand stores for different features
interface DashboardStore {
  // Environment
  currentEnvironment: EnvironmentConfig;
  environments: EnvironmentConfig[];
  switchEnvironment: (envId: string) => void;

  // System Health
  systemHealth: SystemHealth | null;
  updateSystemHealth: (health: SystemHealth) => void;

  // Metrics
  metrics: MetricsData | null;
  updateMetrics: (metrics: MetricsData) => void;

  // Queue Status
  queueStatus: QueueStatus | null;
  updateQueueStatus: (status: QueueStatus) => void;

  // User Management
  users: User[];
  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;

  // API Keys
  apiKeys: ApiKey[];
  selectedApiKey: ApiKey | null;
  setSelectedApiKey: (key: ApiKey | null) => void;

  // Logs
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;

  // UI State
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// React Query for server state
const useDashboardData = () => {
  const { currentEnvironment } = useDashboardStore();

  // System Health
  const { data: systemHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['systemHealth', currentEnvironment.id],
    queryFn: () => api.getSystemHealth(currentEnvironment.apiUrl),
    refetchInterval: 30000, // 30 seconds
  });

  // Metrics
  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['metrics', currentEnvironment.id],
    queryFn: () => api.getMetrics(currentEnvironment.apiUrl),
    refetchInterval: 10000, // 10 seconds
  });

  // Queue Status
  const { data: queueStatus, refetch: refetchQueue } = useQuery({
    queryKey: ['queueStatus', currentEnvironment.id],
    queryFn: () => api.getQueueStatus(currentEnvironment.apiUrl),
    refetchInterval: 5000, // 5 seconds
  });

  return {
    systemHealth,
    metrics,
    queueStatus,
    refetch: {
      health: refetchHealth,
      metrics: refetchMetrics,
      queue: refetchQueue,
    },
  };
};
```

### Data Caching Strategy
```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Cache invalidation strategies
const useCacheInvalidation = () => {
  const queryClient = useQueryClient();

  const invalidateMetrics = useCallback(() => {
    queryClient.invalidateQueries(['metrics']);
  }, [queryClient]);

  const invalidateQueueStatus = useCallback(() => {
    queryClient.invalidateQueries(['queueStatus']);
  }, [queryClient]);

  const invalidateUsers = useCallback(() => {
    queryClient.invalidateQueries(['users']);
  }, [queryClient]);

  return {
    invalidateMetrics,
    invalidateQueueStatus,
    invalidateUsers,
  };
};
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Basic dashboard structure and authentication

**Tasks**:
- [ ] Set up React + TypeScript + Vite project
- [ ] Configure shadcn/ui components and Tailwind CSS
- [ ] Set up Radix UI primitives
- [ ] Implement authentication system
- [ ] Create basic layout and navigation
- [ ] Set up environment switching
- [ ] Add basic routing
- [ ] Configure Lucide React icons

**Deliverables**:
- Working dashboard with login
- Environment selector
- Basic navigation menu with shadcn/ui components
- Responsive layout with Tailwind CSS
- Dark/light theme support

### Phase 2: Core Features (Weeks 3-4)
**Goal**: Essential dashboard functionality

**Tasks**:
- [ ] System health monitoring with shadcn/ui cards
- [ ] Basic metrics display with Recharts
- [ ] User management interface with TanStack Table
- [ ] API key management with forms
- [ ] Basic audit log viewing
- [ ] Implement React Hook Form + Zod validation

**Deliverables**:
- System health dashboard with custom cards
- User management pages with data tables
- API key management with form validation
- Basic logging interface with search/filter

### Phase 3: Real-time Features (Weeks 5-6)
**Goal**: Live monitoring and real-time updates

**Tasks**:
- [ ] WebSocket integration with Socket.io
- [ ] Live log stream with custom components
- [ ] Real-time metrics updates with Recharts
- [ ] Queue monitoring with custom cards
- [ ] Live notifications with Sonner
- [ ] Implement Zustand for state management

**Deliverables**:
- Real-time dashboard updates
- Live log streaming with filtering
- Queue monitoring interface with controls
- Toast notifications system

### Phase 4: Advanced Features (Weeks 7-8)
**Goal**: Advanced analytics and management

**Tasks**:
- [ ] Advanced analytics dashboard with ECharts
- [ ] Queue management controls with custom modals
- [ ] Custom reporting with date pickers
- [ ] Performance optimization
- [ ] Error tracking with custom components
- [ ] Implement React Query for data fetching

**Deliverables**:
- Analytics dashboard with interactive charts
- Queue management tools with real-time controls
- Custom reports with export functionality
- Error tracking system with detailed views

### Phase 5: Polish & Production (Weeks 9-10)
**Goal**: Production-ready dashboard

**Tasks**:
- [ ] UI/UX improvements with shadcn/ui polish
- [ ] Performance optimization and bundle splitting
- [ ] Security hardening
- [ ] Testing and bug fixes
- [ ] Documentation
- [ ] Accessibility improvements (WCAG 2.1 AA)

**Deliverables**:
- Production-ready dashboard with shadcn/ui
- Complete documentation
- Performance optimizations
- Security audit
- Accessible interface

---

## 🛠️ Technical Requirements

### Development Environment
```json
{
  "node": ">=18.0.0",
  "npm": ">=8.0.0",
  "typescript": "^5.0.0",
  "react": "^18.0.0",
  "vite": "^4.0.0"
}
```

### Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.263.1",
    "recharts": "^2.5.0",
    "echarts": "^5.4.0",
    "echarts-for-react": "^3.0.0",
    "zustand": "^4.3.0",
    "@tanstack/react-query": "^4.24.0",
    "@tanstack/react-table": "^8.10.0",
    "socket.io-client": "^4.6.0",
    "react-hook-form": "^7.45.0",
    "@hookform/resolvers": "^3.1.0",
    "zod": "^3.21.0",
    "date-fns": "^2.30.0",
    "sonner": "^1.2.0",
    "cmdk": "^0.2.0",
    "vaul": "^0.7.0",
    "axios": "^1.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.0.0",
    "@vitejs/plugin-react": "^3.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "prettier": "^2.8.0",
    "prettier-plugin-tailwindcss": "^0.5.0"
  }
}
```

### Build Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
      '@lib': resolve(__dirname, 'src/lib'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          radix: ['@radix-ui/react-slot', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['recharts', 'echarts', 'echarts-for-react'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
  },
});
```

### Tailwind Configuration
```typescript
// tailwind.config.js
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Custom dashboard colors
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
          foreground: 'hsl(var(--error-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### Environment Variables
```bash
# .env.development
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_APP_TITLE=SF Middleware Dashboard
VITE_APP_VERSION=1.0.0

# .env.production
VITE_API_URL=https://api.sf-middleware.com
VITE_WS_URL=wss://api.sf-middleware.com
VITE_APP_TITLE=SF Middleware Dashboard
VITE_APP_VERSION=1.0.0
```

---

## 📈 Success Metrics

### Performance Targets
- **Initial Load Time**: < 3 seconds
- **Page Navigation**: < 500ms
- **Real-time Updates**: < 100ms latency
- **Chart Rendering**: < 200ms
- **Search Response**: < 300ms

### User Experience Goals
- **Intuitive Navigation**: Users can find features within 3 clicks
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Accessibility**: WCAG 2.1 AA compliance
- **Error Handling**: Graceful error states with helpful messages

### Business Objectives
- **Reduced Support Tickets**: 50% reduction in API-related support requests
- **Improved Monitoring**: 99.9% uptime visibility
- **Faster Debugging**: 75% reduction in issue resolution time
- **User Adoption**: 90% of users actively using dashboard within 30 days

---

## 🔄 Maintenance & Updates

### Regular Maintenance
- **Weekly**: Performance monitoring and optimization
- **Monthly**: Security updates and dependency updates
- **Quarterly**: Feature reviews and user feedback analysis
- **Annually**: Major version updates and architecture reviews

### Monitoring & Alerts
- **Performance**: Core Web Vitals monitoring
- **Errors**: JavaScript error tracking
- **Usage**: Feature usage analytics
- **Security**: Security event monitoring

### Documentation
- **User Guide**: Step-by-step feature documentation
- **API Documentation**: Backend integration guide
- **Developer Guide**: Code structure and contribution guidelines
- **Troubleshooting**: Common issues and solutions

---

**Last Updated**: November 8, 2025

**Next Steps**: Review this specification and begin Phase 1 implementation with the foundation setup.
