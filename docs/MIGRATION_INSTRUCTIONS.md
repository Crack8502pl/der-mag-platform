# Migration Instructions: Linia Kolejowa

## Overview
This migration adds the `linia_kolejowa` column to the `contracts` table to store optional railway line information in formats like LK-221 or E-20.

## Running the Migration

### Using psql (recommended)
```bash
cd backend
psql -U dermag_user -d grover_db -f scripts/migrations/20260201_add_linia_kolejowa.sql
```

### Using environment variables
```bash
cd backend
psql ${DB_CONNECTION_STRING:-postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}} -f scripts/migrations/20260201_add_linia_kolejowa.sql
```

## What the Migration Does

1. **Adds Column**: Creates `linia_kolejowa` VARCHAR(20) column (nullable)
2. **Adds Comment**: Documents the column purpose and format
3. **Creates Index**: Adds a partial index for filtering by railway line

## Verification

After running the migration, verify it was successful:

```sql
-- Check column exists
SELECT column_name, data_type, character_maximum_length, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'contracts' AND column_name = 'linia_kolejowa';

-- Check index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'contracts' AND indexname = 'idx_contracts_linia_kolejowa';
```

Expected results:
- Column: `linia_kolejowa`, type: `character varying`, length: 20, nullable: YES
- Index: `idx_contracts_linia_kolejowa` exists

## Rollback (if needed)

To rollback this migration:

```sql
-- Remove index
DROP INDEX IF EXISTS idx_contracts_linia_kolejowa;

-- Remove column
ALTER TABLE contracts DROP COLUMN IF EXISTS linia_kolejowa;
```

## Features Enabled

After this migration:
- Contract creation/update API accepts `liniaKolejowa` field
- Task names are automatically prefixed with railway line when provided
- Examples:
  - `LK-221 | Budynek SKD #1`
  - `E-20 | Stacja Warszawa - Peron 1`
  - `LK-221 | SOK - Central`
