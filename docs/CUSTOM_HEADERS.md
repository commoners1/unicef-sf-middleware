# Custom Headers Guide

## X-Request-Type Header

The `x-request-type` header allows clients to specify the business context or purpose of their API call. This information is logged in audit logs to help track usage patterns and debug issues.

### Usage

Add the `x-request-type` header to your API requests:

```bash
# Example: Getting token for a pledge operation
curl -X POST https://api.example.com/v1/salesforce/token \
  -H "x-api-key: your-api-key" \
  -H "x-request-type: pledge" \
  -H "Content-Type: application/json"

# Example: Getting token for a payment link operation
curl -X POST https://api.example.com/v1/salesforce/token \
  -H "x-api-key: your-api-key" \
  -H "x-request-type: payment-link" \
  -H "Content-Type: application/json"

# Example: Getting token for a one-time charge
curl -X POST https://api.example.com/v1/salesforce/token \
  -H "x-api-key: your-api-key" \
  -H "x-request-type: oneoff-charge" \
  -H "Content-Type: application/json"
```

### Supported Endpoints

- **GET /v1/salesforce/token** - Get Salesforce token
- **POST /v1/salesforce/token** - Refresh Salesforce token

### Header Values

Use descriptive values that indicate the business context:

**Common Values:**
- `pledge` - For pledge operations
- `pledge-charge` - For pledge charge operations
- `oneoff` - For one-time donations/payments
- `payment-link` - For payment link generation
- `subscription` - For recurring subscriptions
- `refund` - For refund operations
- `checkout` - For checkout operations

**Custom Values:**
You can use any custom string that makes sense for your application, e.g.:
- `mobile-app-donation`
- `web-checkout-pledge`
- `admin-panel-test`

### Best Practices

1. **Be Consistent** - Use consistent naming across your application
2. **Be Descriptive** - Use clear, meaningful names
3. **Include Context** - If applicable, include the source (e.g., `mobile-app-pledge`)
4. **Optional** - The header is optional; if not provided, defaults to `"token"`

### How It's Used

The `x-request-type` value is stored in audit logs in the `type` field, allowing you to:

1. **Track Usage Patterns** - See which operations are most common
2. **Debug Issues** - Filter audit logs by operation type
3. **Performance Analysis** - Compare performance across different operation types
4. **Security Monitoring** - Identify unusual patterns by operation type

### Audit Log Example

```json
{
  "userId": "user_123",
  "apiKeyId": "key_456",
  "action": "POST",
  "endpoint": "/v1/salesforce/token",
  "method": "getToken",
  "type": "pledge",  // ← Your x-request-type value
  "requestData": { ... },
  "responseData": { ... },
  "statusCode": 200,
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "duration": 150,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Client Implementation Examples

#### JavaScript/TypeScript

```typescript
// Fetch API
const response = await fetch('https://api.example.com/v1/salesforce/token', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-api-key',
    'x-request-type': 'pledge', // ← Add this header
    'Content-Type': 'application/json'
  }
});

// Axios
const response = await axios.post(
  'https://api.example.com/v1/salesforce/token',
  data,
  {
    headers: {
      'x-api-key': 'your-api-key',
      'x-request-type': 'pledge' // ← Add this header
    }
  }
);
```

#### cURL

```bash
curl -X POST https://api.example.com/v1/salesforce/token \
  -H "x-api-key: your-api-key" \
  -H "x-request-type: pledge" \
  -H "Content-Type: application/json"
```

#### Python (requests)

```python
import requests

response = requests.post(
    'https://api.example.com/v1/salesforce/token',
    headers={
        'x-api-key': 'your-api-key',
        'x-request-type': 'pledge'  # ← Add this header
    }
)
```

### Migration

If you're adding this to an existing application:

1. **Start Using It** - Begin adding the header to new code
2. **Gradually Roll Out** - Add it to existing code gradually
3. **Monitor Logs** - Check that the type values are appearing in audit logs
4. **No Breaking Changes** - Missing the header still works (defaults to "token")

### Questions?

Contact your API administrator for more information about custom headers.
