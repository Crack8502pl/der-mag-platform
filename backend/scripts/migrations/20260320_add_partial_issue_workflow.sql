-- Migration: add partial issue workflow columns
-- Adds completed_by_id to completion_orders and issued_quantity to completion_items
-- Also extends the completion_orders.status column to support new status values

-- Add completed_by_id FK to completion_orders
ALTER TABLE completion_orders
  ADD COLUMN IF NOT EXISTS completed_by_id INTEGER REFERENCES users(id);

-- Add issued_quantity to completion_items
ALTER TABLE completion_items
  ADD COLUMN IF NOT EXISTS issued_quantity INTEGER NOT NULL DEFAULT 0;

-- Extend status column length to accommodate new status values (if it is a varchar with limited length)
-- The current length is 30, PARTIAL_PENDING_APPROVAL is 26 chars so it fits.
-- No column alteration needed.
