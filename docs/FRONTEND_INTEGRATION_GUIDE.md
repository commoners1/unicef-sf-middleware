# Frontend Integration Guide

Complete guide for integrating the Salesforce Middleware API with your frontend application, including authentication, CSRF protection, and token management.

## Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [CSRF Protection](#csrf-protection)
4. [Token Management](#token-management)
5. [API Client Setup](#api-client-setup)
6. [Error Handling](#error-handling)
7. [Security Best Practices](#security-best-practices)
8. [Code Examples](#code-examples)

---

## Overview

The API uses a **refresh token mechanism** with **httpOnly cookies** for secure authentication:

- **Access Tokens**: Short-lived (15 minutes), used for API requests
- **Refresh Tokens**: Long-lived (7 days), used to get new access tokens
- **CSRF Protection**: Required for all state-changing operations
- **Automatic Cookie Management**: Browser handles cookies automatically

---

## Authentication Flow

### 1. Login

**Endpoint:** `POST /auth/login`

**Request:**
```typescript
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // IMPORTANT: Required for cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
  }),
});

const data = await response.json();
// Response: { user: {...}, expiresIn: 900 }
```

**What happens:**
- Server sets two httpOnly cookies:
  - `auth_token` (access token, 15 min)
  - `refresh_token` (refresh token, 7 days)
- Cookies are automatically sent with subsequent requests
- No need to manually store tokens

### 2. Making Authenticated Requests

**Automatic (Recommended):**
```typescript
// Cookies are sent automatically with credentials: 'include'
const response = await fetch('http://localhost:3000/user/profile', {
  method: 'GET',
  credentials: 'include', // REQUIRED: Sends cookies
});

const profile = await response.json();
```

**Manual (Alternative):**
```typescript
// Extract token from cookie (if needed for custom headers)
const token = getCookie('auth_token'); // You need to implement this

const response = await fetch('http://localhost:3000/user/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`, // Fallback method
  },
  credentials: 'include',
});
```

### 3. Token Refresh

**When to refresh:**
- Access token expires (15 minutes)
- Before making important requests
- On app startup (check if token is still valid)

**How to refresh:**
```typescript
async function refreshToken() {
  const response = await fetch('http://localhost:3000/auth/refresh', {
    method: 'POST',
    credentials: 'include', // Sends refresh_token cookie
  });

  if (response.ok) {
    const data = await response.json();
    // New tokens are automatically set in cookies
    return true;
  } else {
    // Refresh token expired or invalid - redirect to login
    return false;
  }
}
```

**Automatic refresh on 401:**
```typescript
async function apiRequest(url: string, options: RequestInit = {}) {
  let response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  // If access token expired, try refreshing
  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      // Retry original request with new token
      response = await fetch(url, {
        ...options,
        credentials: 'include',
      });
    } else {
      // Refresh failed - redirect to login
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  return response;
}
```

### 4. Logout

**Endpoint:** `POST /auth/logout`

**Important:** Requires CSRF token (see CSRF Protection section)

```typescript
async function logout() {
  const csrfToken = getCsrfToken(); // Get from cookie or header

  await fetch('http://localhost:3000/auth/logout', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken, // REQUIRED
    },
    credentials: 'include',
  });

  // Redirect to login page
  window.location.href = '/login';
}
```

---

## CSRF Protection

### Overview

All state-changing operations (POST, PUT, PATCH, DELETE) require CSRF protection to prevent Cross-Site Request Forgery attacks.

### How It Works

1. **Server sets CSRF token** in a cookie (`csrf-token`) on every request
2. **Client reads the token** from the cookie (or response header)
3. **Client sends token** in `X-CSRF-Token` header for protected operations
4. **Server validates** that cookie token === header token

### Implementation

#### 1. Get CSRF Token

```typescript
// Method 1: Read from cookie (recommended)
function getCsrfToken(): string | null {
  // Read csrf-token cookie
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// Method 2: Read from response header (convenience)
// The server sets X-CSRF-Token header on every response
// You can extract it from the first API call
let csrfToken: string | null = null;

async function initializeCsrfToken() {
  const response = await fetch('http://localhost:3000/health', {
    credentials: 'include',
  });
  csrfToken = response.headers.get('X-CSRF-Token');
}
```

#### 2. Use CSRF Token in Requests

```typescript
async function makeAuthenticatedRequest(
  url: string,
  method: string = 'GET',
  body?: any
) {
  const csrfToken = getCsrfToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add CSRF token for state-changing operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    if (!csrfToken) {
      throw new Error('CSRF token not found');
    }
    headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  return response;
}
```

#### 3. Endpoints That Require CSRF

**✅ Require CSRF Token:**
- `POST /auth/logout`
- `POST /auth/revoke-all`
- `POST /api-key/generate`
- `POST /api-key/delete`
- `PUT /user/profile`
- `POST /audit/mark-delivered`
- All other POST/PUT/PATCH/DELETE endpoints

**❌ Do NOT Require CSRF:**
- `POST /auth/login`
- `POST /auth/register`
- `GET /health`
- `GET /healthz`
- `GET /auth/refresh` (uses refresh token, not CSRF)
- `/v1/salesforce/*` (API key protected)

---

## Token Management

### Token Expiration

- **Access Token**: 15 minutes
- **Refresh Token**: 7 days

### Token Refresh Strategy

**Option 1: Refresh on 401 (Recommended)**
```typescript
async function apiRequest(url: string, options: RequestInit = {}) {
  let response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  if (response.status === 401) {
    // Try to refresh token
    const refreshResponse = await fetch('http://localhost:3000/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      // Retry original request
      response = await fetch(url, {
        ...options,
        credentials: 'include',
      });
    } else {
      // Refresh failed - redirect to login
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  return response;
}
```

**Option 2: Proactive Refresh**
```typescript
// Refresh token before it expires (e.g., every 14 minutes)
setInterval(async () => {
  await fetch('http://localhost:3000/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
}, 14 * 60 * 1000); // 14 minutes
```

### Session Management

**View Active Sessions:**
```typescript
async function getActiveSessions() {
  const response = await fetch('http://localhost:3000/auth/sessions', {
    method: 'GET',
    credentials: 'include',
  });
  return response.json();
}
```

**Revoke All Sessions:**
```typescript
async function revokeAllSessions() {
  const csrfToken = getCsrfToken();
  
  await fetch('http://localhost:3000/auth/revoke-all', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
    credentials: 'include',
  });
  
  // Redirect to login
  window.location.href = '/login';
}
```

---

## API Client Setup

### Complete API Client Example

```typescript
class ApiClient {
  private baseUrl: string;
  private csrfToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.initializeCsrfToken();
  }

  // Initialize CSRF token from cookie or first request
  private async initializeCsrfToken() {
    this.csrfToken = this.getCsrfTokenFromCookie();
    
    if (!this.csrfToken) {
      // Get from first API call
      const response = await fetch(`${this.baseUrl}/health`, {
        credentials: 'include',
      });
      this.csrfToken = response.headers.get('X-CSRF-Token');
    }
  }

  // Get CSRF token from cookie
  private getCsrfTokenFromCookie(): string | null {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf-token') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  // Get CSRF token (refresh if needed)
  private getCsrfToken(): string {
    if (!this.csrfToken) {
      this.csrfToken = this.getCsrfTokenFromCookie();
    }
    if (!this.csrfToken) {
      throw new Error('CSRF token not available');
    }
    return this.csrfToken;
  }

  // Make authenticated request with automatic token refresh
  async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const method = options.method || 'GET';
    const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add CSRF token for state-changing operations
    if (needsCsrf) {
      headers['X-CSRF-Token'] = this.getCsrfToken();
    }

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // REQUIRED for cookies
    });

    // Handle token expiration
    if (response.status === 401 && endpoint !== '/auth/login') {
      // Try to refresh token
      const refreshResponse = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        // Update CSRF token if provided
        const newCsrfToken = refreshResponse.headers.get('X-CSRF-Token');
        if (newCsrfToken) {
          this.csrfToken = newCsrfToken;
        }

        // Retry original request
        response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      } else {
        // Refresh failed - redirect to login
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    return response;
  }

  // Convenience methods
  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Usage
const api = new ApiClient('http://localhost:3000');

// Login
await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password',
});

// Get profile
const profileResponse = await api.get('/user/profile');
const profile = await profileResponse.json();

// Update profile
await api.put('/user/profile', {
  name: 'New Name',
});

// Logout
await api.post('/auth/logout', {});
```

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Token has been revoked",
  "error": "Unauthorized"
}
```
**Action:** Try refreshing token, or redirect to login

**403 Forbidden (CSRF):**
```json
{
  "statusCode": 403,
  "message": "CSRF token missing. Please include X-CSRF-Token header.",
  "error": "Forbidden"
}
```
**Action:** Ensure CSRF token is included in request header

**429 Too Many Requests:**
```json
{
  "statusCode": 429,
  "message": "Too many requests from this IP, please try again later.",
  "error": "Too Many Requests"
}
```
**Action:** Implement exponential backoff and retry

### Error Handler Example

```typescript
async function handleApiError(response: Response) {
  if (response.status === 401) {
    // Try refresh, then redirect if fails
    const refreshed = await refreshToken();
    if (!refreshed) {
      window.location.href = '/login';
    }
  } else if (response.status === 403) {
    // CSRF error - reinitialize token
    await initializeCsrfToken();
    throw new Error('CSRF token error - please retry');
  } else if (response.status === 429) {
    // Rate limited - wait and retry
    await new Promise(resolve => setTimeout(resolve, 5000));
    throw new Error('Rate limited - please wait');
  }

  const error = await response.json();
  throw new Error(error.message || 'API request failed');
}
```

---

## Security Best Practices

### 1. Always Use `credentials: 'include'`

```typescript
// ✅ Correct
fetch(url, {
  credentials: 'include',
});

// ❌ Wrong - cookies won't be sent
fetch(url);
```

### 2. Handle CORS Properly

Ensure your frontend domain is in the `CORS_ORIGIN` environment variable on the backend.

### 3. Never Store Tokens in localStorage

```typescript
// ❌ WRONG - Don't do this
localStorage.setItem('token', token);

// ✅ CORRECT - Let cookies handle it
// Cookies are httpOnly and automatically managed
```

### 4. Always Include CSRF Token for State-Changing Operations

```typescript
// ✅ Correct
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
  credentials: 'include',
});
```

### 5. Handle Token Expiration Gracefully

```typescript
// ✅ Correct - Automatic refresh on 401
if (response.status === 401) {
  await refreshToken();
  // Retry request
}
```

### 6. Clear Cookies on Logout

```typescript
// ✅ Correct - Server clears cookies, but you can also clear client-side
async function logout() {
  await api.post('/auth/logout', {});
  // Cookies are cleared by server
  // Redirect to login
  window.location.href = '/login';
}
```

---

## Code Examples

### React Example

```typescript
import { useState, useEffect } from 'react';

function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('http://localhost:3000/user/profile', {
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 401) {
        // Try refresh
        const refreshed = await refreshToken();
        if (refreshed) {
          checkAuth(); // Retry
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      return true;
    }
    return false;
  }

  async function logout() {
    const csrfToken = getCsrfToken();
    await fetch('http://localhost:3000/auth/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      credentials: 'include',
    });
    setUser(null);
  }

  return { user, loading, login, logout };
}
```

### Axios Example

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // REQUIRED for cookies
});

// Request interceptor - Add CSRF token
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method || '')) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// Response interceptor - Handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Usage
await api.post('/auth/login', { email, password });
const profile = await api.get('/user/profile');
```

---

## Summary Checklist

- [ ] Use `credentials: 'include'` in all fetch requests
- [ ] Implement CSRF token reading from cookie
- [ ] Include `X-CSRF-Token` header for POST/PUT/PATCH/DELETE
- [ ] Handle 401 errors with automatic token refresh
- [ ] Redirect to login when refresh fails
- [ ] Never store tokens in localStorage/sessionStorage
- [ ] Handle CORS configuration properly
- [ ] Implement proper error handling
- [ ] Test token expiration scenarios
- [ ] Test CSRF protection

---

**Last Updated:** 21 November 2025

For API endpoint details, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

