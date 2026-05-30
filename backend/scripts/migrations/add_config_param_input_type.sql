-- Dodaj kolumnę source_param_name do wejść reguł zależności
ALTER TABLE bom_template_dependency_rule_inputs
  ADD COLUMN IF NOT EXISTS source_param_name VARCHAR(100) NULL;

COMMENT ON COLUMN bom_template_dependency_rule_inputs.source_param_name
  IS 'Nazwa parametru z configParams Wizarda (używane gdy input_type = CONFIG_PARAM)';

-- Rozszerz dozwolone typy wejść o CONFIG_PARAM
ALTER TABLE bom_template_dependency_rule_inputs
  DROP CONSTRAINT IF EXISTS bom_template_dependency_rule_inputs_input_type_check;

ALTER TABLE bom_template_dependency_rule_inputs
  ADD CONSTRAINT bom_template_dependency_rule_inputs_input_type_check
  CHECK (input_type IN ('ITEM', 'RULE_RESULT', 'CONFIG_PARAM'));
