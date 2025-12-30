# Database Migration Guide - Refresh Token Rotation

This guide explains how to run the database migration for the refresh token rotation system.

## Prerequisites

- PostgreSQL database must be running
- Database credentials configured in `.env` file
- `psql` command-line tool installed

## Migration File

The migration file is located at:
```
backend/scripts/migrations/20251116_add_refresh_tokens.sql
```

## Running the Migration

### Option 1: Using npm script (Recommended)

```bash
cd backend
npm run migrate:tokens
```

This will use the database credentials from your environment variables.

### Option 2: Using psql directly

```bash
psql -h localhost -U dermag_user -d dermag_platform -f backend/scripts/migrations/20251116_add_refresh_tokens.sql
```

Replace the host, user, and database name with your actual values.

### Option 3: Using connection string

```bash
psql "postgresql://dermag_user:your_password@localhost:5432/dermag_platform" -f backend/scripts/migrations/20251116_add_refresh_tokens.sql
```

## What the Migration Does

The migration creates:

1. **refresh_tokens table** - Stores all refresh tokens with metadata
2. **Indexes** - For efficient token lookups
3. **cleanup_expired_refresh_tokens() function** - For cleaning up old tokens
4. **audit_logs table** - For security event logging (if it doesn't exist)

## Verifying the Migration

After running the migration, verify that the tables were created:

```sql
-- Connect to your database
psql -h localhost -U dermag_user -d dermag_platform

-- Check if tables exist
\dt refresh_tokens
\dt audit_logs

-- View table structure
\d refresh_tokens

-- Test the cleanup function
SELECT cleanup_expired_refresh_tokens(30);
```

Expected output:
```
 cleanup_expired_refresh_tokens 
--------------------------------
                              0
```

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Drop the tables and function
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_refresh_tokens(INTEGER);
```

**WARNING:** This will delete all refresh tokens and audit logs.

## Next Steps

After running the migration:

1. **Generate JWT secrets** - See TOKEN_ROTATION.md for instructions
2. **Update .env file** - Add JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
3. **Restart the application**
4. **Test the authentication flow**

## Troubleshooting

### Error: "relation already exists"

This is normal if you're running the migration twice. The migration uses `IF NOT EXISTS` clauses, so it's safe to run multiple times.

### Error: "permission denied"

Make sure your database user has the necessary permissions:

```sql
GRANT ALL PRIVILEGES ON DATABASE dermag_platform TO dermag_user;
GRANT ALL ON SCHEMA public TO dermag_user;
```

### Error: "foreign key constraint"

Make sure the `users` table exists before running this migration. The `refresh_tokens` table references the `users` table.

## Maintenance

### Cleanup Old Tokens

Run this periodically (e.g., daily via cron):

```bash
psql -U dermag_user -d dermag_platform -c "SELECT cleanup_expired_refresh_tokens(30);"
```

This removes expired tokens older than 30 days.

### Monitor Token Usage

```sql
-- Count active sessions per user
SELECT user_id, COUNT(*) as active_sessions
FROM refresh_tokens
WHERE revoked = false AND expires_at > NOW()
GROUP BY user_id
ORDER BY active_sessions DESC;

-- View recent security events
SELECT * FROM audit_logs
WHERE event_type = 'TOKEN_REUSE_ATTACK'
ORDER BY created_at DESC
LIMIT 10;
```

## Support

For more information, see:
- TOKEN_ROTATION.md - Complete documentation
- .env.example - Configuration example

---

# BOM Triggers Migration (20251230_add_bom_triggers.sql)

## Overview

This migration adds the BOM (Bill of Materials) Trigger System, enabling automated actions based on task and BOM lifecycle events.

## Running the Migration

### Using psql
```bash
psql "postgresql://dermag_user:your_password@localhost:5432/dermag_platform" -f backend/scripts/migrations/20251230_add_bom_triggers.sql
```

### Using environment variables
```bash
export DB_CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
psql $DB_CONNECTION_STRING -f backend/scripts/migrations/20251230_add_bom_triggers.sql
```

## What the Migration Does

The migration creates:

1. **bom_triggers table** - Stores trigger definitions
   - Supports 5 event types (ON_TASK_CREATE, ON_STATUS_CHANGE, etc.)
   - Supports 5 action types (ADD_MATERIAL, UPDATE_QUANTITY, etc.)
   - JSONB fields for flexible conditions and configurations
   - Priority-based execution order
   
2. **bom_trigger_logs table** - Audit logs for trigger executions
   - Tracks success/failure
   - Stores input and output data
   - Links to tasks and triggers
   
3. **Indexes** - For efficient querying
   - trigger_event, is_active, priority
   - Execution log queries
   
4. **cleanup_old_trigger_logs() function** - Maintenance function
   - Removes logs older than specified days (default: 90)
   
5. **Seed data** - 3 example triggers
   - Auto-add UTP cable to LAN tasks
   - Notify on task completion
   - Calculate costs on material add

## Verifying the Migration

```sql
-- Connect to database
psql -U dermag_user -d dermag_platform

-- Check tables created
\dt bom_triggers
\dt bom_trigger_logs

-- View table structures
\d bom_triggers
\d bom_trigger_logs

-- Check seed data
SELECT id, name, trigger_event, action_type, is_active FROM bom_triggers;

-- Test cleanup function
SELECT cleanup_old_trigger_logs(90);
```

Expected output should show 3 triggers created.

## Rollback (if needed)

```sql
-- Drop tables and function
DROP FUNCTION IF EXISTS cleanup_old_trigger_logs(INTEGER);
DROP TABLE IF EXISTS bom_trigger_logs;
DROP TABLE IF EXISTS bom_triggers;
```

**WARNING:** This will delete all trigger configurations and execution logs.

## Next Steps

After running the migration:

1. **Restart the backend** to load new entities
2. **Test API endpoints** at `/api/bom-triggers`
3. **Use API Tester** at `http://localhost:3000/api-tester.html`
4. **Create custom triggers** via API or UI
5. **Monitor execution** via logs endpoint

## Maintenance

### Cleanup Old Logs

Run periodically (e.g., weekly):

```bash
psql $DB_CONNECTION_STRING -c "SELECT cleanup_old_trigger_logs(90);"
```

### Monitor Trigger Execution

```sql
-- View recent trigger executions
SELECT tl.*, t.name, t.trigger_event, t.action_type
FROM bom_trigger_logs tl
JOIN bom_triggers t ON t.id = tl.trigger_id
ORDER BY tl.executed_at DESC
LIMIT 20;

-- Count executions by trigger
SELECT t.name, COUNT(*) as executions, 
       SUM(CASE WHEN tl.success THEN 1 ELSE 0 END) as successful
FROM bom_trigger_logs tl
JOIN bom_triggers t ON t.id = tl.trigger_id
GROUP BY t.id, t.name
ORDER BY executions DESC;

-- Find failed executions
SELECT tl.*, t.name
FROM bom_trigger_logs tl
JOIN bom_triggers t ON t.id = tl.trigger_id
WHERE tl.success = false
ORDER BY tl.executed_at DESC
LIMIT 10;
```

## Troubleshooting

### Triggers not executing

Check:
1. Trigger is active: `SELECT * FROM bom_triggers WHERE is_active = true;`
2. Conditions match event data
3. Backend logs for errors
4. Trigger logs: `SELECT * FROM bom_trigger_logs WHERE trigger_id = X ORDER BY executed_at DESC;`

### Performance issues

- Review number of active triggers
- Check execution logs for slow actions
- Consider increasing retention period cleanup frequency
- Add indexes if needed for specific queries

## Documentation

For complete implementation details, see:
- `/IMPLEMENTATION_BOM_TRIGGERS.md` - Full documentation
- API endpoints: `/api/bom-triggers/*`
- DTO validation: `backend/src/dto/BomTriggerDto.ts`

