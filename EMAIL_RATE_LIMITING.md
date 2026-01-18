# Email Rate Limiting & Deduplication System

## Overview

This document describes the email rate limiting and deduplication system implemented to prevent **553 5.4.6 Limit exceeded** errors from nazwa.pl SMTP server.

## Problem Statement

After updating stock alert logic (changed from `<=` to `<`), the system began sending too many emails simultaneously, exceeding nazwa.pl's rate limits (50 emails/hour), resulting in delivery failures.

## Solution Components

### 1. Rate Limiting (EmailQueueService.ts)

**Implementation:** Sliding window algorithm using Redis sorted sets

**How it works:**
1. Each email attempt is recorded as a timestamp in Redis
2. Before adding email to queue, check how many emails were sent in the last hour
3. If limit (50) is reached, calculate delay until oldest email expires from window
4. Email is queued with appropriate delay

**Configuration:**
```env
EMAIL_RATE_LIMIT_MAX=50          # Maximum emails per window
EMAIL_RATE_LIMIT_WINDOW=3600000  # Window duration in ms (1 hour)
```

**Key Methods:**
- `checkRateLimit()` - Returns delay in ms if limit exceeded
- `incrementRateLimitCounter()` - Records email send timestamp
- `addToQueue()` - Modified to check rate limit before queueing

**Logging:**
```
⏱️  Rate limit osiągnięty - email opóźniony o 120s
📧 Email dodany do kolejki z opóźnieniem [Job 123]: Alert
```

### 2. Alert Deduplication (StockNotificationService.ts)

**Implementation:** Redis key-value cache with 24-hour TTL

**How it works:**
1. Before sending alert, check if same alert was sent in last 24h
2. Cache key format: `stock-alert:{stockId}:{alertType}`
3. If key exists, skip sending and log
4. After sending, set cache key with 24h expiration

**Alert Types:**
- `LOW` - Low stock level (quantity < minStockLevel)
- `CRITICAL` - Out of stock (quantity = 0)

**Key Methods:**
- `wasAlertSent(stockId, alertType)` - Check if alert was sent
- `markAlertAsSent(stockId, alertType)` - Mark alert as sent
- `notifyLowStock()` - Modified with deduplication
- `notifyCriticalStock()` - Modified with deduplication

**Logging:**
```
⏭️  Pominięto zduplikowany alert LOW dla materiału 123 (wysłany w ciągu ostatnich 24h)
```

### 3. Batch Mode (NotificationSchedulerService.ts)

**Implementation:** Daily digest of all stock alerts

**How it works:**
1. When `EMAIL_ALERTS_MODE=batch`, scheduler runs at specified time
2. Collects all materials with low stock from database
3. Groups alerts by status (CRITICAL/LOW)
4. Sends single email with formatted table to all managers

**Configuration:**
```env
EMAIL_ALERTS_MODE=immediate      # immediate | batch
EMAIL_BATCH_TIME=08:00          # HH:MM format (24-hour)
```

**Key Method:**
- `sendDailyStockAlertsDigest()` - Generates and sends daily digest

**Digest Includes:**
- Total alerts count
- Critical vs low stock counts
- Formatted table with all materials
- Material details (name, catalog number, stock levels, location)

### 4. Queue Management UI (SMTPConfigPage.tsx)

**Implementation:** Admin panel section for queue monitoring

**Features:**
- **Real-time Statistics:**
  - Waiting: Emails pending in queue
  - Active: Emails currently being sent
  - Failed: Failed email attempts
  - Delayed: Emails scheduled for later

- **Actions:**
  - Refresh Statistics: Manual update of queue stats
  - Clear Queue: Remove all pending emails (admin only, with confirmation)

**UI Components:**
```tsx
<div className="queue-management-card">
  <h2>📬 Zarządzanie kolejką emaili</h2>
  <div className="queue-stats">
    {/* Statistics boxes */}
  </div>
  <div className="queue-actions">
    {/* Action buttons */}
  </div>
  <div className="confirm-dialog">
    {/* Confirmation dialog */}
  </div>
</div>
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Email Queue Flow                          │
└─────────────────────────────────────────────────────────────┘

StockNotificationService
         │
         │ notifyLowStock(stockId)
         │
         ├─→ [Deduplication Check]
         │   └─→ Redis: GET stock-alert:{stockId}:LOW
         │       ├─→ Exists? → Skip & Log
         │       └─→ Not Found? → Continue
         │
         ├─→ EmailQueueService.addToQueue()
         │   │
         │   ├─→ [Rate Limit Check]
         │   │   └─→ Redis: ZCARD email:rate-limit
         │   │       ├─→ >= 50? → Calculate Delay
         │   │       └─→ < 50? → No Delay
         │   │
         │   ├─→ [Increment Counter]
         │   │   └─→ Redis: ZADD email:rate-limit
         │   │
         │   └─→ Bull Queue.add(email, { delay })
         │
         └─→ [Mark as Sent]
             └─→ Redis: SETEX stock-alert:{stockId}:LOW 86400
```

## Redis Data Structures

### Rate Limiting (Sorted Set)
```
Key: email:rate-limit
Type: Sorted Set (ZSET)
Members: {timestamp}-{random}
Score: timestamp (ms)
TTL: 2 hours (auto-cleanup)

Example:
ZADD email:rate-limit 1705598400000 "1705598400000-0.123"
ZCARD email:rate-limit  # Returns count
ZREMRANGEBYSCORE email:rate-limit 0 1705594800000  # Remove old
```

### Deduplication (Key-Value)
```
Key: stock-alert:{stockId}:{alertType}
Type: String
Value: "sent"
TTL: 86400 seconds (24 hours)

Example:
SETEX stock-alert:123:LOW 86400 "sent"
GET stock-alert:123:LOW  # Returns "sent" or null
```

## API Endpoints

### Get Queue Statistics
```http
GET /api/notifications/queue/stats
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 143,
    "failed": 3,
    "delayed": 8
  }
}
```

### Clear Queue (Admin Only)
```http
POST /api/notifications/queue/clear
Authorization: Bearer {admin-token}

Response:
{
  "success": true,
  "message": "Kolejka emaili została wyczyszczona"
}
```

## Configuration Files

### Backend (.env)
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Rate Limiting
EMAIL_RATE_LIMIT_MAX=50
EMAIL_RATE_LIMIT_WINDOW=3600000

# Email Alerts Mode
EMAIL_ALERTS_MODE=immediate
EMAIL_BATCH_TIME=08:00

# SMTP Configuration (existing)
SMTP_HOST=smtp.nazwa.pl
SMTP_PORT=587
SMTP_USER=your-email@domain.pl
SMTP_PASSWORD=your-password
```

### Email Config (src/config/email.ts)
```typescript
export const emailConfig = {
  rateLimit: {
    max: parseInt(process.env.EMAIL_RATE_LIMIT_MAX || '50'),
    window: parseInt(process.env.EMAIL_RATE_LIMIT_WINDOW || '3600000'),
  },
  alerts: {
    mode: process.env.EMAIL_ALERTS_MODE || 'immediate',
    batchTime: process.env.EMAIL_BATCH_TIME || '08:00',
  },
  // ... other config
};
```

## Testing

### Rate Limiting Tests
```bash
# Run rate limiting algorithm tests
node /tmp/test-rate-limit.js
```

**Test Cases:**
- ✓ Empty queue (no delay)
- ✓ Below limit (no delay)
- ✓ At limit (delay calculated)
- ✓ Old timestamps removed (sliding window)

### Deduplication Tests
```bash
# Run deduplication logic tests
node /tmp/test-deduplication.js
```

**Test Cases:**
- ✓ First alert not blocked
- ✓ Duplicate alert blocked
- ✓ Different alert type not blocked
- ✓ Different stock not blocked

### Template Validation
```bash
# Validate email template
node /tmp/test-template.js
```

**Checks:**
- ✓ File exists and readable
- ✓ Valid HTML DOCTYPE
- ✓ All required Handlebars variables present

## Monitoring & Logging

### Rate Limiting Logs
```
✅ EmailQueueService zainicjalizowany pomyślnie
   Rate limit: 50 emaili/3600000ms
⏱️  Rate limit osiągnięty - email opóźniony o 120s
📧 Email dodany do kolejki z opóźnieniem [Job 456]: Niski stan
```

### Deduplication Logs
```
⏭️  Pominięto zduplikowany alert LOW dla materiału 123 (wysłany w ciągu ostatnich 24h)
✅ Alert o niskim stanie magazynowym wysłany: Kabel CAT6
```

### Batch Mode Logs
```
📊 Generowanie dziennego digestu alertów magazynowych...
✅ Dzienny digest alertów magazynowych wysłany (15 alertów)
```

## Performance Considerations

### Redis Operations
- Rate limiting: O(log N) for ZADD, O(1) for ZCARD
- Deduplication: O(1) for GET/SETEX
- Memory usage: ~50 bytes per rate limit entry
- Memory usage: ~100 bytes per deduplication cache entry

### Email Queue
- Bull queue uses Redis for persistence
- Failed jobs retained for debugging
- Completed jobs auto-removed to save memory

## Troubleshooting

### Rate Limit Not Working
1. Check Redis connection: `redis-cli ping`
2. Verify config: `echo $EMAIL_RATE_LIMIT_MAX`
3. Check logs for initialization: "EmailQueueService zainicjalizowany"
4. Monitor Redis: `redis-cli ZCARD email:rate-limit`

### Deduplication Not Working
1. Check Redis connection
2. Verify cache keys: `redis-cli KEYS stock-alert:*`
3. Check TTL: `redis-cli TTL stock-alert:123:LOW`
4. Review logs for skip messages

### Queue Management UI Not Loading
1. Check API endpoint: `curl /api/notifications/queue/stats`
2. Verify authentication token
3. Check browser console for errors
4. Verify admin role permissions

## Migration Guide

### Existing Installations

1. **Update .env file:**
   ```bash
   cp .env .env.backup
   echo "EMAIL_RATE_LIMIT_MAX=50" >> .env
   echo "EMAIL_RATE_LIMIT_WINDOW=3600000" >> .env
   echo "EMAIL_ALERTS_MODE=immediate" >> .env
   echo "EMAIL_BATCH_TIME=08:00" >> .env
   ```

2. **Verify Redis is running:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

3. **Restart application:**
   ```bash
   npm run dev  # or pm2 restart app
   ```

4. **Verify initialization:**
   Check logs for:
   - "✅ EmailQueueService zainicjalizowany pomyślnie"
   - "✅ StockNotificationService: Redis połączony"

### Switching to Batch Mode

1. Update .env:
   ```bash
   EMAIL_ALERTS_MODE=batch
   EMAIL_BATCH_TIME=08:00
   ```

2. Restart application

3. Verify cron job registered:
   Look for: "📅 Dzienny digest alertów magazynowych: 08:00"

## Future Enhancements

### Potential Improvements
- [ ] Per-user rate limiting
- [ ] Multiple time windows (hourly, daily)
- [ ] Priority queue bypass for critical alerts
- [ ] Email delivery reports
- [ ] Advanced queue analytics
- [ ] Automatic rate limit adjustment based on SMTP feedback
- [ ] Alert aggregation by category/supplier
- [ ] Webhook notifications as fallback

## Related Documentation

- [EMAIL_SYSTEM.md](./EMAIL_SYSTEM.md) - Overall email system documentation
- [.env.example](./.env.example) - Environment variables reference
- API documentation for notification endpoints

## Support

For issues or questions:
1. Check logs in `/var/log/app/` or console output
2. Verify Redis connectivity
3. Review environment variables
4. Check queue statistics in admin panel
5. Contact system administrator

---

**Last Updated:** 2026-01-18  
**Version:** 1.0.0  
**Author:** Copilot Implementation
