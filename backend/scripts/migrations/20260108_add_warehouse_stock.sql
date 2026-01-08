-- scripts/migrations/20260108_add_warehouse_stock.sql
-- Migracja: Moduł magazynowy - Warehouse Stock
-- Data: 2026-01-08
-- Opis: Implementacja kompletnego modułu zarządzania stanami magazynowymi

-- ============================================
-- TABELA GŁÓWNA: warehouse_stock
-- ============================================

CREATE TABLE IF NOT EXISTS warehouse_stock (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  
  -- Identyfikacja materiału
  catalog_number VARCHAR(100) UNIQUE NOT NULL,
  material_name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  material_type VARCHAR(50) DEFAULT 'consumable' CHECK (material_type IN ('consumable', 'device', 'tool', 'component')),
  
  -- Ilości i jednostki
  unit VARCHAR(50) DEFAULT 'szt',
  quantity_in_stock DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (quantity_in_stock >= 0),
  quantity_reserved DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (quantity_reserved >= 0),
  quantity_available DECIMAL(10,2) GENERATED ALWAYS AS (quantity_in_stock - quantity_reserved) STORED,
  
  -- Poziomy zapasów
  min_stock_level DECIMAL(10,2),
  max_stock_level DECIMAL(10,2),
  reorder_point DECIMAL(10,2),
  
  -- Lokalizacja magazynowa
  warehouse_location VARCHAR(200),
  storage_zone VARCHAR(100),
  
  -- Dane dostawcy i producenta
  supplier VARCHAR(200),
  supplier_catalog_number VARCHAR(200),
  manufacturer VARCHAR(200),
  part_number VARCHAR(200),
  
  -- Ceny
  unit_price DECIMAL(10,2),
  purchase_price DECIMAL(10,2),
  last_purchase_price DECIMAL(10,2),
  average_price DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'PLN',
  
  -- Flagi kontrolne
  is_serialized BOOLEAN DEFAULT false,
  is_batch_tracked BOOLEAN DEFAULT false,
  requires_ip_address BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_hazardous BOOLEAN DEFAULT false,
  requires_certification BOOLEAN DEFAULT false,
  
  -- Kategoria urządzenia (dla material_type = 'device')
  device_category VARCHAR(100),
  
  -- Dane techniczne (JSONB dla elastyczności)
  technical_specs JSONB DEFAULT '{}',
  
  -- Daty
  last_purchase_date TIMESTAMP,
  last_stock_check_date TIMESTAMP,
  expiry_date TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED', 'ORDERED')),
  
  -- Dokumenty i multimedia
  image_url VARCHAR(500),
  datasheet_url VARCHAR(500),
  documents JSONB DEFAULT '[]',
  
  -- Notatki
  notes TEXT,
  internal_notes TEXT,
  
  -- Audyt
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indeksy dla warehouse_stock
CREATE INDEX idx_warehouse_stock_catalog_number ON warehouse_stock(catalog_number);
CREATE INDEX idx_warehouse_stock_material_name ON warehouse_stock(material_name);
CREATE INDEX idx_warehouse_stock_category ON warehouse_stock(category);
CREATE INDEX idx_warehouse_stock_supplier ON warehouse_stock(supplier);
CREATE INDEX idx_warehouse_stock_status ON warehouse_stock(status);
CREATE INDEX idx_warehouse_stock_material_type ON warehouse_stock(material_type);
CREATE INDEX idx_warehouse_stock_warehouse_location ON warehouse_stock(warehouse_location);

-- Trigger dla auto-update timestamp
CREATE OR REPLACE FUNCTION update_warehouse_stock_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_warehouse_stock_timestamp
BEFORE UPDATE ON warehouse_stock
FOR EACH ROW
EXECUTE FUNCTION update_warehouse_stock_timestamp();

-- Trigger walidacji ilości zarezerwowanej
CREATE OR REPLACE FUNCTION validate_warehouse_stock_quantities()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_reserved > NEW.quantity_in_stock THEN
    RAISE EXCEPTION 'Ilość zarezerwowana (%) nie może przekraczać ilości na stanie (%)', NEW.quantity_reserved, NEW.quantity_in_stock;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_warehouse_quantities
BEFORE INSERT OR UPDATE ON warehouse_stock
FOR EACH ROW
EXECUTE FUNCTION validate_warehouse_stock_quantities();

-- ============================================
-- TABELA: warehouse_stock_bom_mapping
-- ============================================

CREATE TABLE IF NOT EXISTS warehouse_stock_bom_mapping (
  id SERIAL PRIMARY KEY,
  warehouse_stock_id INTEGER NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
  bom_template_id INTEGER NOT NULL REFERENCES bom_templates(id) ON DELETE CASCADE,
  
  -- Parametry mapowania
  quantity_per_unit DECIMAL(10,2) DEFAULT 1,
  is_optional BOOLEAN DEFAULT false,
  is_alternative BOOLEAN DEFAULT false,
  notes TEXT,
  
  -- Audyt
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(warehouse_stock_id, bom_template_id)
);

CREATE INDEX idx_warehouse_stock_bom_mapping_stock ON warehouse_stock_bom_mapping(warehouse_stock_id);
CREATE INDEX idx_warehouse_stock_bom_mapping_bom ON warehouse_stock_bom_mapping(bom_template_id);

-- ============================================
-- TABELA: warehouse_stock_workflow_bom_mapping
-- ============================================

CREATE TABLE IF NOT EXISTS warehouse_stock_workflow_bom_mapping (
  id SERIAL PRIMARY KEY,
  warehouse_stock_id INTEGER NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
  workflow_bom_template_item_id INTEGER NOT NULL REFERENCES workflow_bom_template_items(id) ON DELETE CASCADE,
  
  -- Parametry mapowania
  quantity_per_unit DECIMAL(10,2) DEFAULT 1,
  is_optional BOOLEAN DEFAULT false,
  is_alternative BOOLEAN DEFAULT false,
  notes TEXT,
  
  -- Audyt
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(warehouse_stock_id, workflow_bom_template_item_id)
);

CREATE INDEX idx_warehouse_stock_workflow_bom_mapping_stock ON warehouse_stock_workflow_bom_mapping(warehouse_stock_id);
CREATE INDEX idx_warehouse_stock_workflow_bom_mapping_workflow ON warehouse_stock_workflow_bom_mapping(workflow_bom_template_item_id);

-- ============================================
-- TABELA: subsystem_warehouse_stock
-- ============================================

CREATE TABLE IF NOT EXISTS subsystem_warehouse_stock (
  id SERIAL PRIMARY KEY,
  subsystem_id INTEGER NOT NULL REFERENCES subsystems(id) ON DELETE CASCADE,
  warehouse_stock_id INTEGER NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
  
  -- Ilości
  quantity_required DECIMAL(10,2) NOT NULL,
  quantity_reserved DECIMAL(10,2) DEFAULT 0,
  quantity_allocated DECIMAL(10,2) DEFAULT 0,
  
  -- Status przypisania
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESERVED', 'ALLOCATED', 'COMPLETED', 'CANCELLED')),
  
  -- Źródło przypisania
  assignment_source VARCHAR(50) DEFAULT 'MANUAL' CHECK (assignment_source IN ('MANUAL', 'AUTO_BOM', 'AUTO_WORKFLOW')),
  
  notes TEXT,
  
  -- Audyt
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(subsystem_id, warehouse_stock_id)
);

CREATE INDEX idx_subsystem_warehouse_stock_subsystem ON subsystem_warehouse_stock(subsystem_id);
CREATE INDEX idx_subsystem_warehouse_stock_stock ON subsystem_warehouse_stock(warehouse_stock_id);
CREATE INDEX idx_subsystem_warehouse_stock_status ON subsystem_warehouse_stock(status);

-- ============================================
-- TABELA: task_warehouse_stock
-- ============================================

CREATE TABLE IF NOT EXISTS task_warehouse_stock (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  warehouse_stock_id INTEGER NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
  
  -- Ilości
  quantity_required DECIMAL(10,2) NOT NULL,
  quantity_reserved DECIMAL(10,2) DEFAULT 0,
  quantity_used DECIMAL(10,2) DEFAULT 0,
  
  -- Status przypisania
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESERVED', 'ISSUED', 'COMPLETED', 'RETURNED', 'CANCELLED')),
  
  -- Źródło przypisania
  assignment_source VARCHAR(50) DEFAULT 'MANUAL' CHECK (assignment_source IN ('MANUAL', 'AUTO_BOM', 'AUTO_WORKFLOW')),
  
  notes TEXT,
  
  -- Audyt
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(task_id, warehouse_stock_id)
);

CREATE INDEX idx_task_warehouse_stock_task ON task_warehouse_stock(task_id);
CREATE INDEX idx_task_warehouse_stock_stock ON task_warehouse_stock(warehouse_stock_id);
CREATE INDEX idx_task_warehouse_stock_status ON task_warehouse_stock(status);

-- ============================================
-- TABELA: warehouse_stock_history
-- ============================================

CREATE TABLE IF NOT EXISTS warehouse_stock_history (
  id SERIAL PRIMARY KEY,
  warehouse_stock_id INTEGER NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
  
  -- Typ operacji
  operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN (
    'CREATED', 'UPDATED', 'DELETED',
    'STOCK_IN', 'STOCK_OUT', 'STOCK_ADJUSTMENT',
    'RESERVED', 'RESERVATION_RELEASED',
    'ASSIGNED_TO_SUBSYSTEM', 'ASSIGNED_TO_TASK',
    'MAPPED_TO_BOM', 'MAPPED_TO_WORKFLOW',
    'PRICE_UPDATE', 'LOCATION_CHANGE',
    'STATUS_CHANGE', 'IMPORT'
  )),
  
  -- Szczegóły operacji
  quantity_change DECIMAL(10,2),
  quantity_before DECIMAL(10,2),
  quantity_after DECIMAL(10,2),
  
  -- Referencje
  reference_type VARCHAR(50), -- 'SUBSYSTEM', 'TASK', 'IMPORT', etc.
  reference_id INTEGER,
  
  -- Dodatkowe dane (JSONB dla elastyczności)
  details JSONB DEFAULT '{}',
  
  notes TEXT,
  
  -- Audyt
  performed_by INTEGER REFERENCES users(id),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warehouse_stock_history_stock ON warehouse_stock_history(warehouse_stock_id);
CREATE INDEX idx_warehouse_stock_history_operation ON warehouse_stock_history(operation_type);
CREATE INDEX idx_warehouse_stock_history_reference ON warehouse_stock_history(reference_type, reference_id);
CREATE INDEX idx_warehouse_stock_history_date ON warehouse_stock_history(performed_at DESC);

-- ============================================
-- TABELA: warehouse_locations
-- ============================================

CREATE TABLE IF NOT EXISTS warehouse_locations (
  id SERIAL PRIMARY KEY,
  location_code VARCHAR(50) UNIQUE NOT NULL,
  location_name VARCHAR(200) NOT NULL,
  zone VARCHAR(100),
  aisle VARCHAR(50),
  rack VARCHAR(50),
  shelf VARCHAR(50),
  bin VARCHAR(50),
  
  -- Parametry lokalizacji
  capacity DECIMAL(10,2),
  current_usage DECIMAL(10,2) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  location_type VARCHAR(50) CHECK (location_type IN ('WAREHOUSE', 'STORAGE_ROOM', 'VEHICLE', 'EXTERNAL')),
  
  notes TEXT,
  
  -- Audyt
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warehouse_locations_code ON warehouse_locations(location_code);
CREATE INDEX idx_warehouse_locations_zone ON warehouse_locations(zone);
CREATE INDEX idx_warehouse_locations_active ON warehouse_locations(is_active);

-- ============================================
-- TABELA: warehouse_stock_imports (log importów)
-- ============================================

CREATE TABLE IF NOT EXISTS warehouse_stock_imports (
  id SERIAL PRIMARY KEY,
  import_type VARCHAR(50) CHECK (import_type IN ('CSV', 'EXCEL', 'API')),
  filename VARCHAR(500),
  
  -- Statystyki importu
  total_rows INTEGER,
  successful_rows INTEGER,
  failed_rows INTEGER,
  
  -- Wyniki
  import_status VARCHAR(50) CHECK (import_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL')),
  error_log JSONB DEFAULT '[]',
  
  -- Audyt
  imported_by INTEGER REFERENCES users(id),
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_warehouse_stock_imports_status ON warehouse_stock_imports(import_status);
CREATE INDEX idx_warehouse_stock_imports_date ON warehouse_stock_imports(imported_at DESC);

-- ============================================
-- UPRAWNIENIA: warehouse_stock (🏭📦)
-- ============================================

-- Admin - pełny dostęp
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{warehouse_stock}',
  '{"read": true, "create": true, "update": true, "delete": true, "manage_locations": true, "adjust_stock": true, "view_history": true, "view_prices": true, "export": true, "import": true, "reserve_stock": true, "release_stock": true, "auto_assign": true}'::jsonb
)
WHERE name = 'admin';

-- BOM Editor - pełny dostęp
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{warehouse_stock}',
  '{"read": true, "create": true, "update": true, "delete": true, "manage_locations": true, "adjust_stock": true, "view_history": true, "view_prices": true, "export": true, "import": true, "reserve_stock": true, "release_stock": true, "auto_assign": true}'::jsonb
)
WHERE name = 'bom_editor';

-- Manager - zarządzanie bez usuwania
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{warehouse_stock}',
  '{"read": true, "create": true, "update": true, "delete": false, "manage_locations": false, "adjust_stock": true, "view_history": true, "view_prices": true, "export": true, "import": true, "reserve_stock": true, "release_stock": true, "auto_assign": true}'::jsonb
)
WHERE name = 'manager';

-- Coordinator - odczyt i podstawowe operacje
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{warehouse_stock}',
  '{"read": true, "create": false, "update": false, "delete": false, "manage_locations": false, "adjust_stock": false, "view_history": true, "view_prices": true, "export": true, "import": false, "reserve_stock": true, "release_stock": false, "auto_assign": true, "scan_material": true}'::jsonb
)
WHERE name = 'coordinator';

-- Order Picking - skanowanie i rezerwacja
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{warehouse_stock}',
  '{"read": true, "create": false, "update": false, "delete": false, "manage_locations": false, "adjust_stock": false, "view_history": false, "view_prices": false, "export": false, "import": false, "reserve_stock": true, "release_stock": true, "auto_assign": false, "scan_material": true}'::jsonb
)
WHERE name = 'order_picking';

-- Prefabricator - odczyt i historia
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{warehouse_stock}',
  '{"read": true, "create": false, "update": false, "delete": false, "manage_locations": false, "adjust_stock": false, "view_history": true, "view_prices": false, "export": false, "import": false, "reserve_stock": false, "release_stock": false, "auto_assign": false}'::jsonb
)
WHERE name = 'prefabricator';

-- Viewer - tylko odczyt
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{warehouse_stock}',
  '{"read": true, "create": false, "update": false, "delete": false, "manage_locations": false, "adjust_stock": false, "view_history": false, "view_prices": false, "export": false, "import": false, "reserve_stock": false, "release_stock": false, "auto_assign": false}'::jsonb
)
WHERE name = 'viewer';

-- Worker - tylko odczyt
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{warehouse_stock}',
  '{"read": true, "create": false, "update": false, "delete": false, "manage_locations": false, "adjust_stock": false, "view_history": false, "view_prices": false, "export": false, "import": false, "reserve_stock": false, "release_stock": false, "auto_assign": false}'::jsonb
)
WHERE name = 'worker';

-- ============================================
-- KOMENTARZE
-- ============================================

COMMENT ON TABLE warehouse_stock IS '🏭📦 Główna tabela stanów magazynowych materiałów';
COMMENT ON TABLE warehouse_stock_bom_mapping IS 'Mapowanie stanów magazynowych do szablonów BOM';
COMMENT ON TABLE warehouse_stock_workflow_bom_mapping IS 'Mapowanie stanów magazynowych do elementów workflow BOM';
COMMENT ON TABLE subsystem_warehouse_stock IS 'Przypisanie materiałów magazynowych do subsystemów';
COMMENT ON TABLE task_warehouse_stock IS 'Przypisanie materiałów magazynowych do zadań';
COMMENT ON TABLE warehouse_stock_history IS 'Historia operacji magazynowych';
COMMENT ON TABLE warehouse_locations IS 'Lokalizacje magazynowe';
COMMENT ON TABLE warehouse_stock_imports IS 'Log importów materiałów magazynowych';
