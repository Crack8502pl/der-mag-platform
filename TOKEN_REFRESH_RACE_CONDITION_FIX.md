# Token Refresh Race Condition Fix - Implementation Summary

## Problem
Multiple concurrent 401 responses were triggering simultaneous token refresh requests, causing a cascade of `TOKEN_REUSE_ATTACK` events that would log users out immediately after a successful token refresh.

## Root Cause
When an access token expired, multiple concurrent HTTP requests would all receive 401 responses simultaneously. Each 401 triggered the response interceptor to independently call `POST /api/auth/refresh`. Additionally, the `useTokenExpirationWarning` hook might also independently trigger a refresh. This resulted in:

1. First refresh request → Token A revoked, Token B created ✅
2. Second concurrent refresh request arrives with Token A (still in cookie) → Server sees Token A is revoked → `TOKEN_REUSE_ATTACK` detected → **ALL tokens revoked** (including Token B)
3. Cascade of false positives → user logged out

## Solution Overview

The fix implements a three-layer defense:

1. **Frontend Mutex Pattern** - Prevents concurrent refresh requests from being sent
2. **Frontend Coordination** - Ensures the hook doesn't compete with the interceptor
3. **Backend Grace Period** - Handles any race conditions that still reach the server

## Changes Made

### 1. Frontend: `frontend/src/services/api.ts`

#### Added Refresh Promise Singleton (Module-level)
```typescript
// Refresh token mutex - prevents concurrent refresh calls
let refreshPromise: Promise<string> | null = null;
```

#### Modified 401 Response Handler
- When first 401 triggers refresh, creates a singleton promise and stores it
- Subsequent 401s that arrive while refresh is in-flight wait for the same promise
- Promise is cleared in `finally` block after completion
- Added logging for better debugging: "🔄 Starting token refresh (singleton)" and "⏳ Refresh already in progress, waiting for existing promise..."

#### Exported Function
```typescript
export const isRefreshInProgress = (): boolean => refreshPromise !== null;
```

**Benefits:**
- Only ONE refresh request is ever sent to the server at a time
- All concurrent 401 responses share the same refresh result
- Prevents the race condition at the source

### 2. Frontend: `frontend/src/hooks/useTokenExpirationWarning.ts`

#### Added Import
```typescript
import { isRefreshInProgress } from '../services/api';
```

#### Modified refreshToken Callback
Added check at the start of the function:
```typescript
// Check if interceptor already started a refresh
if (isRefreshInProgress()) {
  console.log('⏳ Refresh already in progress via interceptor, skipping');
  return;
}
```

**Benefits:**
- Prevents the hook from triggering its own refresh when the interceptor is already handling it
- Eliminates competition between two refresh mechanisms
- Cleaner separation of concerns

### 3. Backend: `backend/src/controllers/AuthController.ts`

#### Added Grace Period Logic in TOKEN REUSE DETECTION
```typescript
// Check for race condition grace period (defense-in-depth)
const GRACE_PERIOD_MS = 10000; // 10 seconds

if (tokenRecord && tokenRecord.revoked && tokenRecord.revokedAt && tokenRecord.revokedByTokenId) {
  const timeSinceRevocation = Date.now() - tokenRecord.revokedAt.getTime();
  
  if (timeSinceRevocation < GRACE_PERIOD_MS) {
    // This is likely a race condition from concurrent refresh requests
    // Find the new token that replaced this one and return it
    const replacementToken = await refreshTokenRepo.findOne({
      where: { tokenId: tokenRecord.revokedByTokenId, revoked: false }
    });
    
    if (replacementToken) {
      // Log as race condition, not attack
      console.warn(`[REFRESH RACE CONDITION] Token ${decoded.jti} was revoked ${timeSinceRevocation}ms ago by rotation. Returning existing session.`);
      
      // Generate new access token for the replacement token's session
      const payload = { userId: decoded.userId, username: decoded.username, role: decoded.role };
      const newAccessToken = generateAccessToken(payload, replacementToken.tokenId);
      
      res.json({ success: true, data: { accessToken: newAccessToken } });
      return;
    }
  }
}

// If not within grace period or no replacement found, treat as real attack
// ... existing TOKEN_REUSE_ATTACK logic
```

**How it works:**
1. When a revoked token is detected, check if it was revoked recently (< 10 seconds)
2. Check if it has a `revokedByTokenId` (indicates rotation, not logout/attack)
3. If both conditions are met, find the replacement token
4. Return a new access token for the existing session (no revocation)
5. Log as race condition for monitoring

**Benefits:**
- Defense-in-depth: handles edge cases where concurrent requests still reach the server
- Distinguishes between legitimate rotation and actual attacks using `revokedByTokenId`
- Maintains security while improving user experience
- Provides clear logging for debugging

## Security Considerations

### What's Protected
- **Legitimate token rotation**: Grace period only applies to tokens revoked by rotation (with `revokedByTokenId`)
- **Real attacks still detected**: Tokens without `revokedByTokenId` or outside grace period trigger full attack response
- **Time-bounded**: 10-second window is short enough to limit exposure

### What Could Still Be An Issue
- If an attacker has both old and new refresh tokens and uses the old one within 10 seconds, they could get a valid access token
- However, this is a very narrow window and requires the attacker to already have compromised the session
- The frontend mutex makes this scenario extremely unlikely in practice

## Testing

### Unit Tests
Created `backend/tests/unit/controllers/AuthController.race-condition.test.ts` with tests for:
- ✅ Tokens revoked within grace period (should be allowed)
- ✅ Tokens revoked outside grace period (should be blocked)
- ✅ Tokens without revokedByTokenId (should be blocked)
- ✅ Distinguishing rotation from attacks

### Manual Testing
Both frontend and backend build successfully:
- ✅ Frontend typecheck passes
- ✅ Frontend build passes (vite build)
- ✅ Backend typecheck passes
- ✅ Backend build passes (tsc)

## Expected Behavior After Fix

1. **Multiple 401s arrive simultaneously**
   - Only ONE refresh request sent to server
   - All other requests wait for the same promise
   - No race condition at the source

2. **Token expiration warning triggers**
   - Hook checks if interceptor is already refreshing
   - Skips refresh if interceptor is handling it
   - No competition between mechanisms

3. **Edge case: duplicate request reaches server**
   - Backend checks grace period
   - Returns existing session if within 10 seconds and has replacement token
   - User stays logged in, no false positive

4. **Real attack scenario**
   - Token without `revokedByTokenId` → immediate revocation
   - Token outside grace period → immediate revocation
   - Security maintained

## Monitoring and Debugging

### Frontend Logs
- `🔄 Starting token refresh (singleton)` - First refresh started
- `⏳ Refresh already in progress, waiting for existing promise...` - Concurrent request waiting
- `⏳ Refresh already in progress via interceptor, skipping` - Hook coordination
- `✅ Token refresh completed successfully` - Refresh succeeded

### Backend Logs
- `[REFRESH RACE CONDITION] Token {jti} was revoked {time}ms ago by rotation. Returning existing session.` - Grace period applied
- `[SECURITY EVENT] TOKEN_REUSE_ATTACK` - Real attack detected

## Files Modified

1. `frontend/src/services/api.ts` - Added mutex pattern and exported `isRefreshInProgress()`
2. `frontend/src/hooks/useTokenExpirationWarning.ts` - Added coordination with interceptor
3. `backend/src/controllers/AuthController.ts` - Added grace period logic

## Files Created

1. `backend/tests/unit/controllers/AuthController.race-condition.test.ts` - Unit tests for grace period logic
