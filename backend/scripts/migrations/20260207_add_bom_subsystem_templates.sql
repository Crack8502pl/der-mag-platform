-- Migration: Add BOM Subsystem Templates
-- Date: 2026-02-07
-- Description: Creates tables for managing BOM templates for subsystems with task variants

-- Table: bom_subsystem_templates
-- Stores template definitions for different subsystem types and their task variants
CREATE TABLE IF NOT EXISTS bom_subsystem_templates (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(200) NOT NULL,
  subsystem_type VARCHAR(50) NOT NULL,       -- 'SMOKIP_A', 'SMOKIP_B', 'SKD', etc.
  task_variant VARCHAR(50),                   -- 'PRZEJAZD_KAT_A', 'NASTAWNIA', 'LCS', 'CUID', 'SKP', null=ogólny
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subsystem_type, task_variant, version)
);

-- Table: bom_subsystem_template_items
-- Stores individual material items within a template
CREATE TABLE IF NOT EXISTS bom_subsystem_template_items (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES bom_subsystem_templates(id) ON DELETE CASCADE,
  warehouse_stock_id INTEGER REFERENCES warehouse_stock(id),
  material_name VARCHAR(200) NOT NULL,
  catalog_number VARCHAR(100),
  unit VARCHAR(50) DEFAULT 'szt',
  default_quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  
  -- Quantity source configuration
  quantity_source VARCHAR(50) DEFAULT 'FIXED' 
    CHECK (quantity_source IN ('FIXED', 'FROM_CONFIG', 'PER_UNIT', 'DEPENDENT')),
  config_param_name VARCHAR(100),              -- For FROM_CONFIG: parameter name like 'przejazdyKatA'
  depends_on_item_id INTEGER REFERENCES bom_subsystem_template_items(id),  -- For DEPENDENT
  dependency_formula VARCHAR(200),             -- For DEPENDENT: formula like '* 2' or '+ 1'
  
  -- Material properties
  requires_ip BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT true,
  group_name VARCHAR(100),                     -- Group like 'Szafa sterownicza', 'Okablowanie'
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_bom_sub_tmpl_type ON bom_subsystem_templates(subsystem_type);
CREATE INDEX idx_bom_sub_tmpl_variant ON bom_subsystem_templates(task_variant);
CREATE INDEX idx_bom_sub_tmpl_items_tmpl ON bom_subsystem_template_items(template_id);
CREATE INDEX idx_bom_sub_tmpl_items_stock ON bom_subsystem_template_items(warehouse_stock_id);

-- Add comments for documentation
COMMENT ON TABLE bom_subsystem_templates IS 'BOM templates for different subsystem types and task variants';
COMMENT ON TABLE bom_subsystem_template_items IS 'Material items within BOM subsystem templates';
COMMENT ON COLUMN bom_subsystem_templates.subsystem_type IS 'Type of subsystem: SMOKIP_A, SMOKIP_B, SKD, SSWIN, CCTV, etc.';
COMMENT ON COLUMN bom_subsystem_templates.task_variant IS 'Task variant: PRZEJAZD_KAT_A, SKP, NASTAWNIA, LCS, CUID, or NULL for general';
COMMENT ON COLUMN bom_subsystem_template_items.quantity_source IS 'How quantity is determined: FIXED=constant, FROM_CONFIG=from subsystem params, PER_UNIT=multiplied, DEPENDENT=calculated from another item';
COMMENT ON COLUMN bom_subsystem_template_items.config_param_name IS 'Parameter name from subsystem config (for FROM_CONFIG source)';
