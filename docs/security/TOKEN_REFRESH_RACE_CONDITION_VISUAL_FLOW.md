# Token Refresh Race Condition - Visual Flow

## Before the Fix (Problem)

```
Time: T0
User makes 5 concurrent API requests with expired access token
    │
    ├──► Request 1 → 401 → Calls /auth/refresh with Token A
    ├──► Request 2 → 401 → Calls /auth/refresh with Token A  
    ├──► Request 3 → 401 → Calls /auth/refresh with Token A
    ├──► Request 4 → 401 → Calls /auth/refresh with Token A
    └──► Request 5 → 401 → Calls /auth/refresh with Token A

Time: T1 (milliseconds later)
Server processes these refresh requests:
    │
    ├──► Refresh 1: Token A valid → Revoke A, Create Token B ✅
    │                Cookie updated to Token B
    │
    ├──► Refresh 2: Token A revoked! → TOKEN_REUSE_ATTACK ❌
    │                Revokes ALL tokens (including Token B!)
    │
    ├──► Refresh 3: Token A revoked! → TOKEN_REUSE_ATTACK ❌
    │                Revokes ALL tokens again
    │
    ├──► Refresh 4: Token A revoked! → TOKEN_REUSE_ATTACK ❌
    │                Revokes ALL tokens again
    │
    └──► Refresh 5: Token A revoked! → TOKEN_REUSE_ATTACK ❌
                     Revokes ALL tokens again

Result: User gets logged out! 🚫
```

## After the Fix (Solution)

```
Time: T0
User makes 5 concurrent API requests with expired access token
    │
    ├──► Request 1 → 401 → Creates refreshPromise → Calls /auth/refresh
    ├──► Request 2 → 401 → Waits for refreshPromise (no new request)
    ├──► Request 3 → 401 → Waits for refreshPromise (no new request)
    ├──► Request 4 → 401 → Waits for refreshPromise (no new request)
    └──► Request 5 → 401 → Waits for refreshPromise (no new request)

Time: T1 (milliseconds later)
Server processes only ONE refresh request:
    │
    └──► Refresh 1: Token A valid → Revoke A, Create Token B ✅
                     Cookie updated to Token B

Time: T2
refreshPromise resolves with new access token
    │
    ├──► Request 1 retries with new token → Success ✅
    ├──► Request 2 retries with new token → Success ✅
    ├──► Request 3 retries with new token → Success ✅
    ├──► Request 4 retries with new token → Success ✅
    └──► Request 5 retries with new token → Success ✅

Result: User stays logged in! ✅
```

## Edge Case: Backend Grace Period

Even if a duplicate request somehow reaches the server (network delay, etc.):

```
Time: T0
    └──► Refresh 1: Token A valid → Revoke A (revokedByTokenId: B), Create Token B ✅

Time: T1 (5 seconds later - WITHIN grace period)
    └──► Refresh 2: Token A revoked!
                    ↓
                    Check: revoked < 10 seconds ago? YES (5s)
                    Check: has revokedByTokenId? YES (Token B)
                    ↓
                    Find Token B → Still valid ✅
                    ↓
                    Generate new access token for Token B
                    Return success (no revocation) ✅

Result: User stays logged in! ✅
```

## Grace Period Security Check

```
If token is revoked:
    ├── Has revokedByTokenId?
    │   ├── YES → Was revoked by rotation
    │   │         ↓
    │   │         Revoked < 10 seconds ago?
    │   │         ├── YES → Find replacement token
    │   │         │         ├── Found & valid? → Return session ✅
    │   │         │         └── Not found? → TOKEN_REUSE_ATTACK ❌
    │   │         └── NO → TOKEN_REUSE_ATTACK ❌
    │   │
    │   └── NO → Was revoked by logout/attack
    │             ↓
    │             TOKEN_REUSE_ATTACK ❌
    │
    └── All tokens revoked
```

## Hook Coordination

```
Token expiration warning triggers:
    │
    └──► Hook wants to refresh
         ↓
         Check: isRefreshInProgress()?
         ├── YES → Skip (interceptor handling it) ⏸️
         └── NO → Proceed with refresh ▶️
```

## Key Components

### 1. Frontend Mutex (api.ts)
- **Module-level variable**: `let refreshPromise: Promise<string> | null = null`
- **Singleton pattern**: Only one refresh promise exists at a time
- **Automatic cleanup**: Promise cleared in `finally` block

### 2. Hook Coordination (useTokenExpirationWarning.ts)  
- **Check before action**: `if (isRefreshInProgress()) return;`
- **No competition**: Hook defers to interceptor
- **Clean separation**: Each component knows its role

### 3. Backend Grace Period (AuthController.ts)
- **10-second window**: `GRACE_PERIOD_MS = 10000`
- **Rotation detection**: Check `revokedByTokenId`
- **Replacement lookup**: Find and return existing session
- **Security preserved**: Only for legitimate rotations

## Monitoring Points

### Frontend Console Logs
- `🔄 Starting token refresh (singleton)` - First refresh
- `⏳ Refresh already in progress, waiting...` - Concurrent request waiting
- `⏳ Refresh already in progress via interceptor, skipping` - Hook coordination
- `✅ Token refresh completed successfully` - Success

### Backend Console Logs
- `[REFRESH RACE CONDITION] Token X was revoked Yms ago by rotation. Returning existing session.` - Grace period applied
- `[SECURITY EVENT] TOKEN_REUSE_ATTACK` - Real attack detected

## Performance Impact

**Before:**
- 5 concurrent 401s = 5 refresh requests to server
- Network: 5x overhead
- Database: 5x queries
- CPU: 5x token generation

**After:**
- 5 concurrent 401s = 1 refresh request to server  
- Network: 1x (80% reduction)
- Database: 1x queries (80% reduction)
- CPU: 1x token generation (80% reduction)

Plus: No false positives, better UX! 🎉
