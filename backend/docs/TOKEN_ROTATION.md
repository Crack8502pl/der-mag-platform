# Token Rotation and Session Management

This document explains the refresh token rotation system and hybrid token storage strategy implemented in the Grover Platform.

## Overview

The system implements secure refresh token rotation following OAuth 2.0 best practices with a **hybrid token storage strategy** for maximum security:
- **Short-lived access tokens** (15 minutes) stored in JavaScript memory (Zustand store)
- **Long-lived refresh tokens** (7 days) stored in httpOnly cookies
- **CSRF tokens** using Double Submit Cookie pattern
- **Automatic token rotation** on each refresh
- **Reuse detection** to prevent token theft
- **Session management** for users to view and revoke active sessions

## Security Features

### 1. Hybrid Token Storage Strategy

| Token | Storage | Rationale |
|---|---|---|
| **Access Token** | JavaScript memory (Zustand store) | Short-lived (15min), automatically disappears when tab closes, immune to CSRF |
| **Refresh Token** | `httpOnly` + `Secure` + `SameSite=Strict` cookie | Long-lived (7d), invisible to JavaScript (XSS-proof), automatically sent with requests |
| **CSRF Token** | Double Submit Cookie pattern | Protects cookie-based refresh from CSRF attacks |

**Benefits:**
- ✅ **XSS-proof refresh tokens** — httpOnly cookies can't be accessed by JavaScript
- ✅ **CSRF-proof access tokens** — stored only in memory, never sent automatically by the browser
- ✅ **Double Submit Cookie CSRF protection** — prevents cross-site request forgery on cookie-based endpoints
- ✅ **Session survives page refresh** — via silent refresh using the httpOnly cookie (though access token in memory is lost)

### 2. Token Rotation
Every time a refresh token is used, it is immediately revoked and a new pair of tokens (access + refresh) is generated. This ensures that each refresh token can only be used once.

### 3. Reuse Detection
If an already-used (revoked) refresh token is presented, the system assumes a security breach and:
- Revokes ALL refresh tokens for that user
- Logs a security event (`TOKEN_REUSE_ATTACK`)
- Forces the user to re-authenticate

### 4. CSRF Protection

The system uses Double Submit Cookie pattern for CSRF protection:
- On login/refresh, server generates a CSRF token
- Token is set in both an httpOnly=false cookie (readable by JS) and validated from `X-CSRF-Token` header
- On refresh/logout, server validates that header token matches cookie token
- Prevents CSRF attacks on cookie-based endpoints

### 5. Separate JWT Secrets
The system uses separate secrets for access and refresh tokens:
- `JWT_ACCESS_SECRET` - for short-lived access tokens
- `JWT_REFRESH_SECRET` - for long-lived refresh tokens

This limits the impact if one secret is compromised.

### 6. Database Whitelist
All valid refresh tokens are stored in the database with metadata:
- Token ID (jti claim)
- User ID
- IP address
- User agent
- Creation and expiration timestamps
- Revocation status

### 7. Paranoid Mode (Optional)
When `PARANOID_MODE=true` is set, the system verifies on every API request that the access token's jti exists in the database and hasn't been revoked. This adds extra security at the cost of performance.

## Database Schema

### refresh_tokens Table

```sql
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    token_id UUID NOT NULL UNIQUE,           -- JWT jti claim
    user_id INTEGER NOT NULL,                 -- Foreign key to users
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    revoked_by_token_id UUID NULL,           -- ID of token that replaced this one
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    device_fingerprint VARCHAR(255) NULL
);
```

### audit_logs Table

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id INTEGER NULL,
    ip_address VARCHAR(45) NULL,
    details JSONB NULL,
    created_at TIMESTAMP NOT NULL
);
```

## API Endpoints

### POST /api/auth/login
Authenticate user and receive tokens.

**Request:**
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Zalogowano pomyślnie",
  "data": {
    "accessToken": "eyJhbGc...",
    "user": {
      "id": 1,
      "username": "user@example.com",
      "email": "user@example.com",
      "firstName": "Jan",
      "lastName": "Kowalski",
      "role": "admin"
    }
  }
}
```

**Cookies Set:**
- `refreshToken` (httpOnly, secure, sameSite=strict, path=/api/auth) - 7 days
- `csrf-token` (secure, sameSite=strict, path=/) - 7 days

### GET /api/auth/csrf-token
Bootstrap CSRF token for SPA.

**Response:**
```json
{
  "success": true,
  "data": {
    "csrfToken": "random-csrf-token-here"
  }
}
```

**Cookies Set:**
- `csrf-token` (secure, sameSite=strict, path=/) - 7 days

### POST /api/auth/refresh
Rotate tokens using refresh token from httpOnly cookie.

**Headers:**
```
X-CSRF-Token: <csrf_token>
Cookie: refreshToken=<refresh_token>; csrf-token=<csrf_token>
```

**Request:** Empty body (refresh token comes from cookie)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc..."
  }
}
```

**Cookies Set:**
- `refreshToken` (httpOnly, secure, sameSite=strict, path=/api/auth) - new rotated token
- `csrf-token` (secure, sameSite=strict, path=/) - new CSRF token

**Response (CSRF Invalid):**
```json
{
  "success": false,
  "message": "Invalid CSRF token",
  "code": "CSRF_TOKEN_INVALID"
}
```

**Response (Token Reuse Detected):**
```json
{
  "success": false,
  "message": "Wykryto próbę ponownego użycia tokenu. Wszystkie sesje zostały unieważnione.",
  "code": "TOKEN_REUSE_ATTACK"
}
```

### POST /api/auth/logout
Revoke current session's refresh token and clear cookies.

**Headers:**
```
Authorization: Bearer <access_token>
Cookie: refreshToken=<refresh_token>
```

**Request:** Empty body (refresh token comes from cookie)

**Response:**
```json
{
  "success": true,
  "message": "Wylogowano pomyślnie"
}
```

**Cookies Cleared:**
- `refreshToken` (path=/api/auth)
- `csrf-token` (path=/)

### POST /api/auth/logout/all
Revoke all active sessions for the current user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Wylogowano ze wszystkich sesji",
  "data": {
    "revokedCount": 3
  }
}
```

### GET /api/auth/sessions
List all active sessions for the current user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "tokenId": "uuid-here",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2025-11-16T10:30:00Z",
        "expiresAt": "2025-11-23T10:30:00Z"
      }
    ],
    "count": 1
  }
}
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# JWT Configuration
JWT_ACCESS_SECRET=[GENERATE-STRONG-SECRET-HERE]
JWT_REFRESH_SECRET=[GENERATE-DIFFERENT-STRONG-SECRET-HERE]
ACCESS_EXPIRES=15m
REFRESH_EXPIRES=7d
JWT_ISSUER=der-mag-platform
JWT_AUDIENCE=der-mag-api

# Optional: Paranoid Mode
PARANOID_MODE=false
```

### Generating Secrets

Use Node.js to generate strong random secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run this command twice to generate two different secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

## Migration

### Running the Migration

1. Ensure your database connection is configured in `.env`
2. Run the migration script:

```bash
psql -h localhost -U dermag_user -d dermag_platform -f backend/scripts/migrations/20251116_add_refresh_tokens.sql
```

Or use the npm script (if added):

```bash
npm run migrate:tokens
```

### Verifying Migration

Check if tables were created:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('refresh_tokens', 'audit_logs');
```

## Token Cleanup

### Manual Cleanup

Remove expired tokens older than 30 days:

```sql
SELECT cleanup_expired_refresh_tokens(30);
```

### Automated Cleanup (Recommended)

Set up a cron job to run daily:

```bash
# Add to crontab
0 2 * * * psql -U dermag_user -d dermag_platform -c "SELECT cleanup_expired_refresh_tokens(30);" > /dev/null 2>&1
```

## Client Implementation Guide

### 1. Store Tokens Securely

⚠️ **IMPORTANT:** With the hybrid strategy, tokens are stored differently:

```javascript
// After login - store only access token in memory (Zustand store)
// Refresh token is automatically stored in httpOnly cookie by the server
useAuthStore.getState().setAccessToken(data.accessToken);

// NO MORE localStorage for refresh tokens!
// ❌ localStorage.setItem('refreshToken', data.refreshToken); // DANGEROUS!
```

### 2. Use Access Token for API Calls

```javascript
// Get access token from Zustand store
const accessToken = useAuthStore.getState().accessToken;

const response = await fetch('/api/tasks', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  credentials: 'include' // Required for cookies
});
```

### 3. Handle Token Expiration with Cookie-Based Refresh

```javascript
async function apiCall(url, options = {}) {
  const accessToken = useAuthStore.getState().accessToken;
  
  let response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  // If access token expired, refresh it
  if (response.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      // Retry original request with new token
      const newAccessToken = useAuthStore.getState().accessToken;
      response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newAccessToken}`
        }
      });
    }
  }

  return response;
}

async function refreshTokens() {
  try {
    // Get CSRF token from cookie
    const csrfToken = document.cookie.match(/csrf-token=([^;]+)/)?.[1];
    
    if (!csrfToken) {
      throw new Error('No CSRF token');
    }
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Include httpOnly refresh token cookie
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      }
    });

    if (response.ok) {
      const data = await response.json();
      // Store new access token in Zustand
      useAuthStore.getState().setAccessToken(data.data.accessToken);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  // Refresh failed - clear store and redirect to login
  useAuthStore.getState().logout();
  window.location.href = '/login';
  return false;
}
```

### 4. Silent Refresh on App Start

```javascript
// On app initialization, try to restore session using httpOnly cookie
async function initializeAuth() {
  const accessToken = useAuthStore.getState().accessToken;
  
  // If no access token in memory, try silent refresh
  if (!accessToken) {
    try {
      const csrfToken = document.cookie.match(/csrf-token=([^;]+)/)?.[1];
      
      if (!csrfToken) {
        // No CSRF token - fetch one first
        await fetch('/api/auth/csrf-token', { credentials: 'include' });
        const newCsrfToken = document.cookie.match(/csrf-token=([^;]+)/)?.[1];
        
        if (!newCsrfToken) return;
      }
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': csrfToken || newCsrfToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        
        // Fetch user info
        const meResponse = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${data.data.accessToken}`
          },
          credentials: 'include'
        });
        
        if (meResponse.ok) {
          const userData = await meResponse.json();
          useAuthStore.getState().setUser(userData.data);
        }
      }
    } catch (error) {
      console.log('Silent refresh failed - user not authenticated');
    }
  }
}
```

### 5. Handle Token Reuse Detection

```javascript
async function refreshTokens() {
  try {
    const csrfToken = document.cookie.match(/csrf-token=([^;]+)/)?.[1];
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      }
    });

    const data = await response.json();

    if (data.code === 'TOKEN_REUSE_ATTACK') {
      // Security breach detected - force re-login
      alert('Wykryto podejrzaną aktywność. Zaloguj się ponownie.');
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return false;
    }

    if (response.ok) {
      useAuthStore.getState().setAccessToken(data.data.accessToken);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  return false;
}
```

## Security Best Practices

1. **Always use HTTPS** in production to prevent token interception
2. **Set short expiration times** for access tokens (15m recommended)
3. **Monitor audit logs** regularly for suspicious activity
4. **Rotate JWT secrets** periodically (every 90 days)
5. **Run cleanup function** regularly to remove old tokens
6. **Enable paranoid mode** for high-security environments
7. **Use httpOnly cookies** for refresh tokens (XSS-proof)
8. **Implement CSRF protection** for cookie-based endpoints
9. **Store access tokens in memory** (Zustand) instead of localStorage
10. **Never log or expose** tokens in error messages
11. **Enable SameSite=Strict** on cookies to prevent CSRF
12. **Set appropriate cookie paths** to limit cookie scope

## Rotating JWT Secrets

### Step-by-Step Process

1. **Generate new secrets:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Update environment variables:**
   - Add new secrets as `JWT_ACCESS_SECRET_NEW` and `JWT_REFRESH_SECRET_NEW`
   - Keep old secrets active

3. **Deploy with dual verification:**
   - Modify JWT verification to accept both old and new secrets
   - Generate new tokens with new secrets

4. **Wait for token expiration:**
   - Wait for refresh token expiration period (7 days)

5. **Remove old secrets:**
   - Remove old secrets from environment
   - Deploy final version

### Emergency Secret Rotation

If secrets are compromised:

1. **Immediately update secrets** in environment
2. **Restart application**
3. **Revoke all refresh tokens:**
   ```sql
   UPDATE refresh_tokens SET revoked = true, revoked_at = NOW();
   ```
4. **Notify users** to re-authenticate

## Troubleshooting

### Migration Required Error

**Error:** `System rotacji tokenów nie jest skonfigurowany`

**Solution:** Run the migration script to create the `refresh_tokens` table.

### JWT Secret Error

**Error:** `JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined`

**Solution:** Add both secrets to your `.env` file.

### Token Reuse Detected

**Error:** `TOKEN_REUSE_ATTACK`

**Cause:** Someone tried to use an already-used refresh token, indicating:
- Token theft
- Client-side bugs causing duplicate requests
- User logged in on multiple devices with old tokens

**Action:** User must re-authenticate. Check audit logs for suspicious activity.

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Token reuse attempts** - Count of `TOKEN_REUSE_ATTACK` events
2. **Failed refresh attempts** - High rate may indicate attacks
3. **Session count per user** - Unusual counts may indicate compromised accounts
4. **Token rotation rate** - Should match expected user activity

### Query Examples

Count token reuse attempts today:
```sql
SELECT COUNT(*) FROM audit_logs 
WHERE event_type = 'TOKEN_REUSE_ATTACK' 
AND created_at > CURRENT_DATE;
```

Find users with many active sessions:
```sql
SELECT user_id, COUNT(*) as session_count 
FROM refresh_tokens 
WHERE revoked = false AND expires_at > NOW() 
GROUP BY user_id 
HAVING COUNT(*) > 5 
ORDER BY session_count DESC;
```

## Testing

See `backend/tests/auth.token-rotation.test.ts` for integration test examples.

## References

- [OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
