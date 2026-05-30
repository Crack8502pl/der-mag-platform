-- Migration: Make target_item_id nullable for SELECT_RECORDER / SELECT_DISKS rules
-- Created: 2026-05-30
-- Description: Rules with SELECT_RECORDER or SELECT_DISKS aggregation type are handled
--              by BomResolverService in the Wizard and do not require a manual target item.

-- Make target_item_id nullable
ALTER TABLE bom_template_dependency_rules
  ALTER COLUMN target_item_id DROP NOT NULL;

-- Expand aggregation_type CHECK constraint to include SELECT_RECORDER and SELECT_DISKS
-- (the original migration only listed SUM,COUNT,MIN,MAX,PRODUCT,FIRST)
ALTER TABLE bom_template_dependency_rules
  DROP CONSTRAINT IF EXISTS bom_template_dependency_rules_aggregation_type_check;

ALTER TABLE bom_template_dependency_rules
  ADD CONSTRAINT bom_template_dependency_rules_aggregation_type_check
  CHECK (aggregation_type IN (
    'SUM','COUNT','MIN','MAX','PRODUCT','FIRST',
    'SELECT_RECORDER','SELECT_DISKS'
  ));

-- Also expand math_operation CHECK constraint to include CALCULATE_STORAGE
-- (the original migration also did not include CALCULATE_STORAGE)
ALTER TABLE bom_template_dependency_rules
  DROP CONSTRAINT IF EXISTS bom_template_dependency_rules_math_operation_check;

ALTER TABLE bom_template_dependency_rules
  ADD CONSTRAINT bom_template_dependency_rules_math_operation_check
  CHECK (math_operation IN (
    'NONE','FLOOR_DIV','MODULO','ADD','SUBTRACT','MULTIPLY',
    'CEIL_DIV','ROUND_DIV','CALCULATE_STORAGE'
  ));
