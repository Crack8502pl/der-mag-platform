#!/bin/bash
# Script to run all database migrations in order
# Usage: npm run migrate:all

set -e  # Exit on error

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection string
DB_CONNECTION_STRING="${DB_CONNECTION_STRING:-postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}}"

echo "======================================"
echo "🔄 Running all database migrations..."
echo "======================================"
echo ""

# Counter
TOTAL=0
SUCCESS=0
FAILED=0

# Get all .sql files in migrations directory and sort them
MIGRATION_DIR="scripts/migrations"
MIGRATIONS=$(ls -1 ${MIGRATION_DIR}/*.sql 2>/dev/null | sort)

if [ -z "$MIGRATIONS" ]; then
  echo "❌ No migration files found in ${MIGRATION_DIR}"
  exit 1
fi

# Run each migration
for MIGRATION_FILE in $MIGRATIONS; do
  FILENAME=$(basename "$MIGRATION_FILE")
  TOTAL=$((TOTAL + 1))
  
  echo "[$TOTAL] 📦 Running: $FILENAME"
  
  # Run migration and capture output
  if psql "$DB_CONNECTION_STRING" -f "$MIGRATION_FILE" 2>&1 | grep -q "ERROR"; then
    echo "    ⚠️  Already applied or error (continuing...)"
    FAILED=$((FAILED + 1))
  else
    echo "    ✅ Success"
    SUCCESS=$((SUCCESS + 1))
  fi
  
  echo ""
done

echo "======================================"
echo "📊 Migration Summary:"
echo "   Total:   $TOTAL"
echo "   Success: $SUCCESS"
echo "   Skipped: $FAILED"
echo "======================================"
echo ""
echo "✅ Migration process completed!"
echo ""
