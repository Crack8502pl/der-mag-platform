ALTER TABLE bom_template_dependency_rules
  DROP CONSTRAINT IF EXISTS bom_template_dependency_rules_aggregation_type_check;

ALTER TABLE bom_template_dependency_rules
  ADD CONSTRAINT bom_template_dependency_rules_aggregation_type_check
  CHECK (aggregation_type IN (
    'SUM','COUNT','MIN','MAX','PRODUCT','FIRST',
    'SELECT_RECORDER','SELECT_DISKS','SELECT_SLICAN_CENTRAL'
  ));
