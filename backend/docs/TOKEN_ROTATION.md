# Token Rotation and Session Management

This document explains the refresh token rotation system implemented in the Der-Mag Platform backend.

## Overview

The system implements secure refresh token rotation following OAuth 2.0 best practices:
- **Short-lived access tokens** (15 minutes) for API access
- **Long-lived refresh tokens** (7 days) stored in database
- **Automatic token rotation** on each refresh
- **Reuse detection** to prevent token theft
- **Session management** for users to view and revoke active sessions

## Security Features

### 1. Token Rotation
Every time a refresh token is used, it is immediately revoked and a new pair of tokens (access + refresh) is generated. This ensures that each refresh token can only be used once.

### 2. Reuse Detection
If an already-used (revoked) refresh token is presented, the system assumes a security breach and:
- Revokes ALL refresh tokens for that user
- Logs a security event (`TOKEN_REUSE_ATTACK`)
- Forces the user to re-authenticate

### 3. Separate JWT Secrets
The system uses separate secrets for access and refresh tokens:
- `JWT_ACCESS_SECRET` - for short-lived access tokens
- `JWT_REFRESH_SECRET` - for long-lived refresh tokens

This limits the impact if one secret is compromised.

### 4. Database Whitelist
All valid refresh tokens are stored in the database with metadata:
- Token ID (jti claim)
- User ID
- IP address
- User agent
- Creation and expiration timestamps
- Revocation status

### 5. Paranoid Mode (Optional)
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
    "refreshToken": "eyJhbGc...",
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

### POST /api/auth/refresh
Rotate tokens using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
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
Revoke current session's refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wylogowano pomyślnie"
}
```

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

```javascript
// After login
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);
```

### 2. Use Access Token for API Calls

```javascript
const response = await fetch('/api/tasks', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});
```

### 3. Handle Token Expiration

```javascript
async function apiCall(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
  });

  // If access token expired, refresh it
  if (response.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      // Retry original request
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
    }
  }

  return response;
}

async function refreshTokens() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  // Refresh failed - redirect to login
  localStorage.clear();
  window.location.href = '/login';
  return false;
}
```

### 4. Handle Token Reuse Detection

```javascript
async function refreshTokens() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();

    if (data.code === 'TOKEN_REUSE_ATTACK') {
      // Security breach detected - force re-login
      alert('Wykryto podejrzaną aktywność. Zaloguj się ponownie.');
      localStorage.clear();
      window.location.href = '/login';
      return false;
    }

    if (response.ok) {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
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
7. **Store refresh tokens securely** on the client (httpOnly cookies preferred)
8. **Never log or expose** tokens in error messages

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
