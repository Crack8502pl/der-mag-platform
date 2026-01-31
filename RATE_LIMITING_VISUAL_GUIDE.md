# Rate Limiting Solution - Visual Flow

## Problem: Cascading 429 Errors

```
External User → Frontend → Backend
                    ↓
            Multiple /api/auth/me requests
                    ↓
            Rate Limiter (100 req/15min)
                    ↓
            🔴 429 Too Many Requests
                    ↓
         Modal disappears, no logout
                    ↓
         🔴 Portal becomes unusable
```

## Solution: Intelligent Rate Limiting

### Backend Architecture

```
┌─────────────────────────────────────────────────┐
│                  Express App                    │
└─────────────────────────────────────────────────┘
                      ↓
        ┌─────────────┴──────────────┐
        ↓                            ↓
┌─────────────────┐        ┌─────────────────┐
│  Auth Limiter   │        │  API Limiter    │
│  30 req/min     │        │  100 req/15min  │
│  /api/auth/*    │        │  /api/*         │
│  (skip general) │        │  (skip auth)    │
└─────────────────┘        └─────────────────┘
```

### Frontend Error Handling Flow

```
API Request → Axios Interceptor
                    ↓
              Check Status
                    ↓
         ┌──────────┴──────────┐
         ↓                     ↓
    [401 Unauthorized]    [429 Too Many]
         ↓                     ↓
  Check Rate Limit     Set Rate Limited Flag
         ↓                     ↓
   Try Refresh         Exponential Backoff
         ↓                     ↓
  ┌──────┴────────┐      ┌────┴─────┐
  ↓               ↓      ↓          ↓
Success      [429]    Retry 1    Retry 2
  ↓           ↓        (5s)       (15s)
Save      Don't        ↓          ↓
Token     Logout    Success    Success
              ↓        ↓          ↓
          Keep      Return     Return
          Session   Result     Result
                       ↓          ↓
                    [429]      [429]
                       ↓          ↓
                    Retry 2    Max Retries
                    (15s)      → Fail
                                 ↓
                             Show Error
                             Keep Session
```

### Token Expiration Hook Flow

```
Timer (1s interval)
      ↓
Check Token Expiry
      ↓
┌─────┴─────┐
↓           ↓
< 40s     > 40s
↓           ↓
Show      Hide
Modal     Modal
↓
User Clicks "Refresh"
      ↓
Check Rate Limited
      ↓
┌─────┴─────┐
↓           ↓
NO         YES
↓           ↓
Try        Show Error
Refresh    Wait...
↓
┌─────┴─────┐
↓           ↓
Success    [429]
↓           ↓
Save       Retry (5s)
Token          ↓
↓         ┌────┴────┐
Hide      ↓         ↓
Modal   Success  [429]
             ↓         ↓
          Save     Retry (5s)
          Token        ↓
             ↓    ┌────┴────┐
          Hide    ↓         ↓
          Modal Success  [429]
                    ↓         ↓
                 Save     Max Retries
                 Token    Show Error
                    ↓
                 Hide
                 Modal
```

## Rate Limit Comparison

### Before (Single Limiter)
```
All Endpoints: 100 req/15min
┌────────────────────────────────┐
│ /api/auth/login                │ ─┐
│ /api/auth/refresh              │  │
│ /api/auth/me                   │  │ All share
│ /api/tasks                     │  │ same quota
│ /api/contracts                 │  │
│ /api/documents                 │  │
│ ...                            │ ─┘
└────────────────────────────────┘
    ↓ Auth calls consume
      general quota quickly
    ↓ 429 errors cascade
```

### After (Dual Limiters)
```
Auth Endpoints: 30 req/min        General API: 100 req/15min
┌──────────────────────┐         ┌──────────────────────┐
│ /api/auth/login      │         │ /api/tasks           │
│ /api/auth/refresh    │         │ /api/contracts       │
│ /api/auth/me         │         │ /api/documents       │
│ /api/auth/logout     │         │ /api/...             │
└──────────────────────┘         └──────────────────────┘
      ↓                                 ↓
  Separate quota                    Separate quota
  4.5x more permissive              Standard rate
      ↓                                 ↓
  Prevents cascading                Better isolation
```

## Rate Calculation

### Auth Endpoints (More Permissive)
- 30 requests / 60,000 ms = 0.0005 req/ms
- = 0.5 req/sec
- = 1 request every 2 seconds

### General API
- 100 requests / 900,000 ms = 0.00011 req/ms  
- = 0.11 req/sec
- = 1 request every 9 seconds

### Ratio
Auth is **4.5x more permissive** than general API!

## Error Response Format

### Before
```json
"Zbyt wiele żądań z tego adresu IP, spróbuj ponownie później"
```

### After
```json
{
  "success": false,
  "message": "Zbyt wiele żądań autoryzacyjnych, spróbuj ponownie za chwilę",
  "code": "RATE_LIMIT_AUTH",
  "retryAfter": 60
}
```

**Headers:**
```
RateLimit-Limit: 30
RateLimit-Remaining: 0
RateLimit-Reset: 1706707200
Retry-After: 60
```

## Modal UI States

### State 1: Normal Warning
```
┌─────────────────────────────────┐
│           ⏰                     │
│  Sesja wygasa za 35 sekund      │
│                                 │
│  Twoja sesja wkrótce wygaśnie.  │
│  Czy chcesz kontynuować pracę?  │
│                                 │
│  [████████████░░░░░] 87%        │
│                                 │
│  [🔄 Odśwież sesję] [🚪 Wyloguj]│
│                                 │
│  Naciśnij Enter aby odświeżyć   │
└─────────────────────────────────┘
```

### State 2: Refreshing
```
┌─────────────────────────────────┐
│           ⏳                     │
│    Odświeżanie sesji...         │
│                                 │
│  Twoja sesja wkrótce wygaśnie.  │
│  Czy chcesz kontynuować pracę?  │
│                                 │
│  [████████████░░░░░] 87%        │
│                                 │
│  [⏳ Odświeżanie...] [🚪 Wyloguj]│
│  (disabled)         (disabled)  │
│                                 │
│  Proszę czekać...               │
└─────────────────────────────────┘
```

### State 3: Error (Rate Limited)
```
┌─────────────────────────────────┐
│           ⏰                     │
│  Sesja wygasa za 28 sekund      │
│                                 │
│  ⚠️ Serwer przeciążony.         │
│     Ponowna próba za 5s... (1/3)│
│                                 │
│  Twoja sesja wkrótce wygaśnie.  │
│  Czy chcesz kontynuować pracę?  │
│                                 │
│  [██████████░░░░░░░] 70%        │
│                                 │
│  [🔄 Odśwież sesję] [🚪 Wyloguj]│
│                                 │
│  Naciśnij Enter aby odświeżyć   │
└─────────────────────────────────┘
```

## Configuration

### Environment Variables (.env)
```bash
# Optional - override defaults

# General API Rate Limiting
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes (default)
RATE_LIMIT_MAX_REQUESTS=100        # 100 requests (default)

# Auth Endpoints Rate Limiting  
RATE_LIMIT_AUTH_WINDOW_MS=60000    # 1 minute (default)
RATE_LIMIT_AUTH_MAX_REQUESTS=30    # 30 requests (default)
```

### For Higher Load
```bash
# Example: Increase limits for high-traffic scenarios
RATE_LIMIT_WINDOW_MS=900000        # Keep at 15 min
RATE_LIMIT_MAX_REQUESTS=200        # Double to 200 requests

RATE_LIMIT_AUTH_WINDOW_MS=60000    # Keep at 1 min
RATE_LIMIT_AUTH_MAX_REQUESTS=60    # Double to 60 requests
```

## Benefits

### 1. Better User Experience
- ✅ No unexpected logouts
- ✅ Clear error messages
- ✅ Automatic retries
- ✅ Loading indicators

### 2. Better System Resilience
- ✅ Prevents cascade failures
- ✅ Isolated rate limits
- ✅ Graceful degradation
- ✅ Server protection

### 3. Better Developer Experience
- ✅ Configurable via env vars
- ✅ Clear error codes
- ✅ Standard headers
- ✅ Well-tested

### 4. Better Security
- ✅ Prevents API abuse
- ✅ DoS protection
- ✅ Per-IP tracking
- ✅ Exponential backoff

## Monitoring

### Metrics to Track
1. Rate limit hits (general vs auth)
2. Retry success rate
3. Average retry count
4. 429 error frequency
5. Token refresh success rate

### Logs to Watch
```
⚠️ Rate limit exceeded. Retry after 60s
🔄 Retry 1/2 after 5000ms
✅ Token odświeżony pomyślnie
❌ Rate limit: max retries exceeded
⚠️ Token refresh rate limited - keeping session
```

## Next Steps

1. Deploy to staging
2. Monitor rate limit metrics
3. Adjust limits if needed via env vars
4. Deploy to production
5. Monitor for 24-48 hours
6. Document any issues

## Success Criteria

✅ No cascading 429 errors  
✅ Token expiration modal works under load  
✅ Users can refresh tokens even at high usage  
✅ Portal remains functional during rate limiting  
✅ Clear user feedback on errors  
✅ Automatic retry succeeds most of the time  
✅ No breaking changes to existing functionality
