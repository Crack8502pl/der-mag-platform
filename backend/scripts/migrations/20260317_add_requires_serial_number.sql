-- Migration: Add requires_serial_number field to BOM entities and task_number to completion_orders
-- Date: 2026-03-17

-- Add requires_serial_number to bom_subsystem_template_items
ALTER TABLE bom_subsystem_template_items
  ADD COLUMN IF NOT EXISTS requires_serial_number BOOLEAN NOT NULL DEFAULT false;

-- Add requires_serial_number to task_generated_bom_items
ALTER TABLE task_generated_bom_items
  ADD COLUMN IF NOT EXISTS requires_serial_number BOOLEAN NOT NULL DEFAULT false;

-- Add requires_serial_number to task_materials
ALTER TABLE task_materials
  ADD COLUMN IF NOT EXISTS requires_serial_number BOOLEAN NOT NULL DEFAULT false;

-- Add task_number to completion_orders (links completion order to originating task)
ALTER TABLE completion_orders
  ADD COLUMN IF NOT EXISTS task_number VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_completion_orders_task_number
  ON completion_orders(task_number);
