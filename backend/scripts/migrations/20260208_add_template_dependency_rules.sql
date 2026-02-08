-- Migration: Add BOM template dependency rules system
-- Created: 2026-02-08
-- Description: Advanced dependency rules engine for BOM subsystem templates with multi-input aggregation, math operations, and conditional results

-- Create bom_template_dependency_rules table
CREATE TABLE IF NOT EXISTS bom_template_dependency_rules (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES bom_subsystem_templates(id) ON DELETE CASCADE,
  rule_name VARCHAR(200) NOT NULL,
  rule_code VARCHAR(100),
  description TEXT,
  evaluation_order INTEGER DEFAULT 0 NOT NULL,
  aggregation_type VARCHAR(30) NOT NULL DEFAULT 'SUM'
    CHECK (aggregation_type IN ('SUM','COUNT','MIN','MAX','PRODUCT','FIRST')),
  math_operation VARCHAR(30) DEFAULT 'NONE' NOT NULL
    CHECK (math_operation IN ('NONE','FLOOR_DIV','MODULO','ADD','SUBTRACT','MULTIPLY','CEIL_DIV','ROUND_DIV')),
  math_operand DECIMAL(10,2),
  target_item_id INTEGER NOT NULL REFERENCES bom_subsystem_template_items(id),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create bom_template_dependency_rule_inputs table
CREATE TABLE IF NOT EXISTS bom_template_dependency_rule_inputs (
  id SERIAL PRIMARY KEY,
  rule_id INTEGER NOT NULL REFERENCES bom_template_dependency_rules(id) ON DELETE CASCADE,
  input_type VARCHAR(20) NOT NULL DEFAULT 'ITEM'
    CHECK (input_type IN ('ITEM', 'RULE_RESULT')),
  source_item_id INTEGER REFERENCES bom_subsystem_template_items(id),
  source_rule_id INTEGER REFERENCES bom_template_dependency_rules(id),
  only_if_selected BOOLEAN DEFAULT true NOT NULL,
  input_multiplier DECIMAL(10,2) DEFAULT 1 NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL
);

-- Create bom_template_dependency_rule_conditions table
CREATE TABLE IF NOT EXISTS bom_template_dependency_rule_conditions (
  id SERIAL PRIMARY KEY,
  rule_id INTEGER NOT NULL REFERENCES bom_template_dependency_rules(id) ON DELETE CASCADE,
  condition_order INTEGER NOT NULL DEFAULT 0,
  comparison_operator VARCHAR(10) NOT NULL
    CHECK (comparison_operator IN ('>','<','>=','<=','==','!=','BETWEEN')),
  compare_value DECIMAL(10,2) NOT NULL,
  compare_value_max DECIMAL(10,2),
  result_value DECIMAL(10,2) NOT NULL,
  description VARCHAR(200)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bom_template_dependency_rules_template_id 
  ON bom_template_dependency_rules(template_id);
CREATE INDEX IF NOT EXISTS idx_bom_template_dependency_rules_target_item_id 
  ON bom_template_dependency_rules(target_item_id);
CREATE INDEX IF NOT EXISTS idx_bom_template_dependency_rules_evaluation_order 
  ON bom_template_dependency_rules(evaluation_order);
CREATE INDEX IF NOT EXISTS idx_bom_template_dependency_rules_is_active 
  ON bom_template_dependency_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_bom_template_dependency_rule_inputs_rule_id 
  ON bom_template_dependency_rule_inputs(rule_id);
CREATE INDEX IF NOT EXISTS idx_bom_template_dependency_rule_inputs_source_item_id 
  ON bom_template_dependency_rule_inputs(source_item_id);
CREATE INDEX IF NOT EXISTS idx_bom_template_dependency_rule_inputs_source_rule_id 
  ON bom_template_dependency_rule_inputs(source_rule_id);

CREATE INDEX IF NOT EXISTS idx_bom_template_dependency_rule_conditions_rule_id 
  ON bom_template_dependency_rule_conditions(rule_id);
CREATE INDEX IF NOT EXISTS idx_bom_template_dependency_rule_conditions_condition_order 
  ON bom_template_dependency_rule_conditions(condition_order);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_bom_template_dependency_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bom_template_dependency_rules_updated_at ON bom_template_dependency_rules;
CREATE TRIGGER trigger_bom_template_dependency_rules_updated_at
  BEFORE UPDATE ON bom_template_dependency_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_bom_template_dependency_rules_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON bom_template_dependency_rules TO dermag_user;
GRANT USAGE, SELECT ON SEQUENCE bom_template_dependency_rules_id_seq TO dermag_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON bom_template_dependency_rule_inputs TO dermag_user;
GRANT USAGE, SELECT ON SEQUENCE bom_template_dependency_rule_inputs_id_seq TO dermag_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON bom_template_dependency_rule_conditions TO dermag_user;
GRANT USAGE, SELECT ON SEQUENCE bom_template_dependency_rule_conditions_id_seq TO dermag_user;
