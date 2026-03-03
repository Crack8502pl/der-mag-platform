-- Migration: Add deletion_reason column to users table
-- Date: 2026-03-03

ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_reason VARCHAR(500) NULL;
