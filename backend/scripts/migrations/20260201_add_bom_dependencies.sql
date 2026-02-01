-- Migration: Add BOM dependency rules and update BOM templates
-- Created: 2026-02-01

-- Add system_type column to bom_templates if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bom_templates' AND column_name = 'system_type'
  ) THEN
    ALTER TABLE bom_templates 
    ADD COLUMN system_type VARCHAR(50);
  END IF;
END $$;

-- Create bom_dependency_rules table
CREATE TABLE IF NOT EXISTS bom_dependency_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  condition_operator VARCHAR(10) DEFAULT 'AND' NOT NULL,
  actions JSONB NOT NULL,
  category VARCHAR(50),
  system_type VARCHAR(50),
  priority INTEGER DEFAULT 10 NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bom_dependency_rules_category ON bom_dependency_rules(category);
CREATE INDEX IF NOT EXISTS idx_bom_dependency_rules_system_type ON bom_dependency_rules(system_type);
CREATE INDEX IF NOT EXISTS idx_bom_dependency_rules_active ON bom_dependency_rules(active);
CREATE INDEX IF NOT EXISTS idx_bom_dependency_rules_priority ON bom_dependency_rules(priority);

-- Create index on bom_templates for system_type
CREATE INDEX IF NOT EXISTS idx_bom_templates_system_type ON bom_templates(system_type);
CREATE INDEX IF NOT EXISTS idx_bom_templates_category_system_type ON bom_templates(category, system_type);

-- Insert seed data for dependency rules
INSERT INTO bom_dependency_rules (name, description, conditions, condition_operator, actions, category, system_type, priority, active)
VALUES
  (
    'Min porty switch dla kamer + NVR',
    'Switch musi mieć wystarczającą liczbę portów dla wszystkich kamer i NVR',
    '[
      {"materialCategory": "CAMERA", "field": "quantity", "operator": ">=", "value": 1},
      {"materialCategory": "NVR", "field": "exists", "operator": "exists", "value": true}
    ]'::jsonb,
    'AND',
    '[
      {
        "targetMaterialCategory": "SWITCH",
        "field": "minPorts",
        "formula": "cameras + nvr + 1",
        "message": "Switch musi mieć minimum {result} portów"
      }
    ]'::jsonb,
    NULL,
    NULL,
    10,
    true
  ),
  (
    'UPS wymagany dla NVR',
    'Jeśli jest NVR, UPS jest obowiązkowy',
    '[
      {"materialCategory": "NVR", "field": "exists", "operator": "exists", "value": true}
    ]'::jsonb,
    'AND',
    '[
      {
        "targetMaterialCategory": "UPS",
        "field": "required",
        "formula": "true",
        "message": "UPS jest wymagany gdy używany jest NVR"
      }
    ]'::jsonb,
    NULL,
    'SMOKIP_A',
    20,
    true
  ),
  (
    'IR lampy dla instalacji >= 4 kamer',
    'Przy 4+ kamerach wymagane są lampy IR',
    '[
      {"materialCategory": "CAMERA", "field": "quantity", "operator": ">=", "value": 4}
    ]'::jsonb,
    'AND',
    '[
      {
        "targetMaterialCategory": "IR_LAMP",
        "field": "minQuantity",
        "formula": "Math.ceil(cameras / 2)",
        "message": "Wymagane minimum {result} lamp IR"
      }
    ]'::jsonb,
    'PRZEJAZD_KAT_A',
    'SMOKIP_A',
    30,
    true
  ),
  (
    'Patch panel dla dużych switchy',
    'Switch >= 16 portów wymaga patch panela',
    '[
      {"materialCategory": "SWITCH", "field": "quantity", "operator": ">=", "value": 1}
    ]'::jsonb,
    'AND',
    '[
      {
        "targetMaterialCategory": "PATCH_PANEL",
        "field": "required",
        "formula": "switch_ports >= 16",
        "message": "Patch panel wymagany dla switch >= 16 portów"
      }
    ]'::jsonb,
    NULL,
    NULL,
    40,
    true
  )
ON CONFLICT DO NOTHING;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_bom_dependency_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bom_dependency_rules_updated_at ON bom_dependency_rules;
CREATE TRIGGER trigger_bom_dependency_rules_updated_at
  BEFORE UPDATE ON bom_dependency_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_bom_dependency_rules_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON bom_dependency_rules TO dermag_user;
GRANT USAGE, SELECT ON SEQUENCE bom_dependency_rules_id_seq TO dermag_user;
