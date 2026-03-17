-- Migration: Make completion BOM references nullable and add task_material_id
-- Date: 2026-03-17
-- Description: Allow completion_orders.generated_bom_id and completion_items.bom_item_id
--              to be NULL so that completion orders can be created from TaskMaterial
--              (new BOM system) without a WorkflowGeneratedBom record.
--              Also adds task_material_id to completion_items for traceability.

-- 1. Make generated_bom_id nullable in completion_orders
ALTER TABLE completion_orders
    ALTER COLUMN generated_bom_id DROP NOT NULL;

-- 2. Make bom_item_id nullable in completion_items
ALTER TABLE completion_items
    ALTER COLUMN bom_item_id DROP NOT NULL;

-- 3. Add task_material_id to completion_items for new BOM system traceability
ALTER TABLE completion_items
    ADD COLUMN IF NOT EXISTS task_material_id INTEGER REFERENCES task_materials(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_completion_items_task_material ON completion_items(task_material_id) WHERE task_material_id IS NOT NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: completion_orders.generated_bom_id and completion_items.bom_item_id are now nullable';
    RAISE NOTICE 'Column added: completion_items.task_material_id';
END $$;
