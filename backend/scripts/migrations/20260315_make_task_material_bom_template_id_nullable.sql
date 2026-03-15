-- Migration: Make bom_template_id nullable in task_materials
-- This allows TaskMaterial records to be created from BomSubsystemTemplate
-- without requiring a BOMTemplate reference.

-- Drop existing foreign key constraint if it exists
ALTER TABLE "task_materials"
  DROP CONSTRAINT IF EXISTS "FK_task_materials_bom_template_id";

-- Allow NULL values in bom_template_id column
ALTER TABLE "task_materials"
  ALTER COLUMN "bom_template_id" DROP NOT NULL;

-- Re-add foreign key constraint with ON DELETE SET NULL
ALTER TABLE "task_materials"
  ADD CONSTRAINT "FK_task_materials_bom_template_id"
  FOREIGN KEY ("bom_template_id")
  REFERENCES "bom_templates"("id")
  ON DELETE SET NULL;
