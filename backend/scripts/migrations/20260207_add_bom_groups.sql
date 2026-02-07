-- Migration: Add BOM groups table
-- Date: 2026-02-07
-- Description: Creates bom_groups table for managing BOM material groups

BEGIN;

-- Create bom_groups table
CREATE TABLE IF NOT EXISTS bom_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(10),
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE bom_groups IS 'BOM material groups with icons and colors for categorization';

-- Add comments to columns
COMMENT ON COLUMN bom_groups.name IS 'Group name (unique)';
COMMENT ON COLUMN bom_groups.icon IS 'Emoji icon for visual representation';
COMMENT ON COLUMN bom_groups.color IS 'Hex color code (e.g., #f59e0b)';
COMMENT ON COLUMN bom_groups.sort_order IS 'Display order (lower values first)';
COMMENT ON COLUMN bom_groups.is_active IS 'Soft delete flag';

-- Create index for active groups
CREATE INDEX IF NOT EXISTS idx_bom_groups_active ON bom_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_bom_groups_sort_order ON bom_groups(sort_order);

-- Seed initial data (7 default groups)
INSERT INTO bom_groups (name, icon, color, sort_order)
VALUES 
  ('Szafa sterownicza', '🗄️', '#3b82f6', 10),
  ('Okablowanie', '🔌', '#10b981', 20),
  ('Urządzenia aktywne', '📡', '#8b5cf6', 30),
  ('Zasilanie', '⚡', '#f59e0b', 40),
  ('Czujniki/detektory', '🔍', '#ef4444', 50),
  ('Osprzęt montażowy', '🔧', '#6b7280', 60),
  ('Inne', '📦', '#9ca3af', 70)
ON CONFLICT (name) DO NOTHING;

COMMIT;
