#!/bin/bash
# Database reset script - works without postgres password
# Uses sudo to run commands as postgres user

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables from .env
if [ -f backend/.env ]; then
  export $(cat backend/.env | grep -v '^#' | xargs)
elif [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
DB_NAME="${DB_NAME:-dermag_platform}"
DB_USER="${DB_USER:-dermag_user}"

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}🔄 Database Reset Script${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo -e "${YELLOW}Database: $DB_NAME${NC}"
echo -e "${YELLOW}User: $DB_USER${NC}"
echo ""

# Step 1: Drop database
echo -e "${RED}🗑️  Step 1: Dropping database...${NC}"
if sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null; then
  echo -e "${GREEN}   ✅ Database dropped successfully${NC}"
else
  echo -e "${YELLOW}   ⚠️  Database may not exist (continuing...)${NC}"
fi
echo ""

# Step 2: Create database
echo -e "${BLUE}➕ Step 2: Creating database...${NC}"
if sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"; then
  echo -e "${GREEN}   ✅ Database created successfully${NC}"
else
  echo -e "${RED}   ❌ Failed to create database${NC}"
  exit 1
fi
echo ""

# Step 3: Grant privileges
echo -e "${BLUE}👤 Step 3: Granting privileges to $DB_USER...${NC}"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" || true
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO $DB_USER;" || true
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;" || true
echo -e "${GREEN}   ✅ Privileges granted${NC}"
echo ""

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}✅ Database reset completed!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${BLUE}📦 Running migrations and seed...${NC}"
echo ""

# Step 4: Run migrations and seed
npm run db:setup
