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
