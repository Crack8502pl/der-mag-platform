-- Migration: Add recorder/disk specs and product successor support
-- Created: 2026-03-29
-- Description: Extends BOM template dependency rules system with:
--   1. successor/predecessor columns on warehouse_stock
--   2. recorder_specifications table
--   3. disk_specifications table
--   4. New columns on bom_template_dependency_rules

-- ============================================================
-- 1. Extend warehouse_stock with successor/predecessor support
-- ============================================================

ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS successor_id INTEGER REFERENCES warehouse_stock(id);
ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS predecessor_id INTEGER REFERENCES warehouse_stock(id);
ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS discontinued_date TIMESTAMP;
ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS replacement_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_successor ON warehouse_stock(successor_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_predecessor ON warehouse_stock(predecessor_id);

-- ============================================================
-- 2. Create recorder_specifications table
-- ============================================================

CREATE TABLE IF NOT EXISTS recorder_specifications (
  id SERIAL PRIMARY KEY,
  warehouse_stock_id INTEGER NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
  model_name VARCHAR(100) NOT NULL,
  min_cameras INTEGER NOT NULL DEFAULT 1,
  max_cameras INTEGER NOT NULL,
  disk_slots INTEGER NOT NULL DEFAULT 1,
  max_storage_tb DECIMAL(10,2),
  supported_disk_capacities JSONB DEFAULT '[6, 8, 10, 12, 14, 18]',
  requires_extension BOOLEAN DEFAULT false,
  extension_warehouse_stock_id INTEGER REFERENCES warehouse_stock(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recorder_specs_warehouse ON recorder_specifications(warehouse_stock_id);
CREATE INDEX IF NOT EXISTS idx_recorder_specs_cameras ON recorder_specifications(min_cameras, max_cameras);

-- ============================================================
-- 3. Create disk_specifications table
-- ============================================================

CREATE TABLE IF NOT EXISTS disk_specifications (
  id SERIAL PRIMARY KEY,
  warehouse_stock_id INTEGER NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
  capacity_tb DECIMAL(10,2) NOT NULL,
  disk_type VARCHAR(50) DEFAULT 'HDD_SURVEILLANCE'
    CHECK (disk_type IN ('HDD_SURVEILLANCE', 'HDD_ENTERPRISE', 'SSD')),
  compatible_recorder_ids JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_disk_specs_warehouse ON disk_specifications(warehouse_stock_id);
CREATE INDEX IF NOT EXISTS idx_disk_specs_capacity ON disk_specifications(capacity_tb);

-- ============================================================
-- 4. Extend bom_template_dependency_rules with new columns
-- ============================================================

ALTER TABLE bom_template_dependency_rules
  ADD COLUMN IF NOT EXISTS target_warehouse_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS selection_criteria JSONB,
  ADD COLUMN IF NOT EXISTS storage_days_param VARCHAR(100),
  ADD COLUMN IF NOT EXISTS storage_bitrate_mbps DECIMAL(5,2) DEFAULT 4.0;

-- Extend aggregation_type check to include new types
ALTER TABLE bom_template_dependency_rules
  DROP CONSTRAINT IF EXISTS bom_template_dependency_rules_aggregation_type_check;

ALTER TABLE bom_template_dependency_rules
  ADD CONSTRAINT bom_template_dependency_rules_aggregation_type_check
  CHECK (aggregation_type IN ('SUM','COUNT','MIN','MAX','PRODUCT','FIRST','SELECT_RECORDER','SELECT_DISKS'));

-- Extend math_operation check to include CALCULATE_STORAGE
ALTER TABLE bom_template_dependency_rules
  DROP CONSTRAINT IF EXISTS bom_template_dependency_rules_math_operation_check;

ALTER TABLE bom_template_dependency_rules
  ADD CONSTRAINT bom_template_dependency_rules_math_operation_check
  CHECK (math_operation IN ('NONE','FLOOR_DIV','MODULO','ADD','SUBTRACT','MULTIPLY','CEIL_DIV','ROUND_DIV','CALCULATE_STORAGE'));

-- ============================================================
-- 5. Update triggers for recorder_specifications and disk_specifications
-- ============================================================

CREATE OR REPLACE FUNCTION update_recorder_specifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recorder_specifications_updated_at ON recorder_specifications;
CREATE TRIGGER trigger_recorder_specifications_updated_at
  BEFORE UPDATE ON recorder_specifications
  FOR EACH ROW
  EXECUTE FUNCTION update_recorder_specifications_updated_at();

CREATE OR REPLACE FUNCTION update_disk_specifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_disk_specifications_updated_at ON disk_specifications;
CREATE TRIGGER trigger_disk_specifications_updated_at
  BEFORE UPDATE ON disk_specifications
  FOR EACH ROW
  EXECUTE FUNCTION update_disk_specifications_updated_at();

-- ============================================================
-- 6. Grant permissions
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON recorder_specifications TO dermag_user;
GRANT USAGE, SELECT ON SEQUENCE recorder_specifications_id_seq TO dermag_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON disk_specifications TO dermag_user;
GRANT USAGE, SELECT ON SEQUENCE disk_specifications_id_seq TO dermag_user;
