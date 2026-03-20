-- Migration: add warehouse_stock_id to completion_items
-- Links each completion item to a WarehouseStock record for stock data and reservation tracking

ALTER TABLE completion_items
  ADD COLUMN IF NOT EXISTS warehouse_stock_id INTEGER REFERENCES warehouse_stock(id);

CREATE INDEX IF NOT EXISTS idx_completion_items_warehouse_stock_id
  ON completion_items(warehouse_stock_id);
