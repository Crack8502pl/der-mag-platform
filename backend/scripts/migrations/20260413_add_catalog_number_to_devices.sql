-- Migration: Add catalog_number column to devices table
-- Date: 2026-04-13

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS catalog_number VARCHAR(200) DEFAULT NULL;
