-- scripts/migrations/20260111_increase_warehouse_stock_column_limits.sql
-- Migracja: Zwiększenie limitów kolumn w warehouse_stock
-- Data: 2026-01-11
-- Opis: Zwiększenie limitów znaków dla kolumn tekstowych aby obsłużyć dłuższe nazwy materiałów

-- ============================================
-- ZWIĘKSZENIE LIMITÓW KOLUMN
-- ============================================

-- Zwiększ limit dla material_name do 500 znaków
ALTER TABLE warehouse_stock 
ALTER COLUMN material_name TYPE VARCHAR(500);

-- Zwiększ limit dla catalog_number do 200 znaków
ALTER TABLE warehouse_stock 
ALTER COLUMN catalog_number TYPE VARCHAR(200);

-- Zwiększ limit dla supplier do 500 znaków
ALTER TABLE warehouse_stock 
ALTER COLUMN supplier TYPE VARCHAR(500);

-- Zwiększ limit dla warehouse_location do 500 znaków
ALTER TABLE warehouse_stock 
ALTER COLUMN warehouse_location TYPE VARCHAR(500);

-- Zwiększ limit dla manufacturer do 500 znaków
ALTER TABLE warehouse_stock 
ALTER COLUMN manufacturer TYPE VARCHAR(500);

-- Zwiększ limit dla category do 200 znaków
ALTER TABLE warehouse_stock 
ALTER COLUMN category TYPE VARCHAR(200);

-- Zwiększ limit dla subcategory do 200 znaków
ALTER TABLE warehouse_stock 
ALTER COLUMN subcategory TYPE VARCHAR(200);

-- ============================================
-- KOMENTARZE
-- ============================================
COMMENT ON COLUMN warehouse_stock.material_name IS 'Nazwa materiału - max 500 znaków';
COMMENT ON COLUMN warehouse_stock.catalog_number IS 'Numer katalogowy - max 200 znaków';
COMMENT ON COLUMN warehouse_stock.supplier IS 'Dostawca - max 500 znaków';
COMMENT ON COLUMN warehouse_stock.warehouse_location IS 'Lokalizacja magazynowa - max 500 znaków';
COMMENT ON COLUMN warehouse_stock.manufacturer IS 'Producent - max 500 znaków';
COMMENT ON COLUMN warehouse_stock.category IS 'Kategoria - max 200 znaków';
COMMENT ON COLUMN warehouse_stock.subcategory IS 'Podkategoria - max 200 znaków';
