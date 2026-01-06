-- scripts/migrations/20260106_workflow_updates.sql
-- Migracja: Aktualizacja SystemType enum i dodanie brakujących kolumn

-- ============================================
-- 1. Aktualizacja enum system_type
-- ============================================

-- Usuń stare wartości enum i dodaj nowe
-- UWAGA: Ta operacja wymaga wcześniejszego sprawdzenia czy w bazie nie ma danych używających starych wartości

-- Sprawdź istniejące wartości
DO $$
BEGIN
  -- Dodaj nowe wartości do enum jeśli jeszcze nie istnieją
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SKD' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subsystems_system_type_enum')) THEN
    ALTER TYPE subsystems_system_type_enum ADD VALUE IF NOT EXISTS 'SKD';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CCTV' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subsystems_system_type_enum')) THEN
    ALTER TYPE subsystems_system_type_enum ADD VALUE IF NOT EXISTS 'CCTV';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SDIP' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subsystems_system_type_enum')) THEN
    ALTER TYPE subsystems_system_type_enum ADD VALUE IF NOT EXISTS 'SDIP';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUG' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subsystems_system_type_enum')) THEN
    ALTER TYPE subsystems_system_type_enum ADD VALUE IF NOT EXISTS 'SUG';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LAN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subsystems_system_type_enum')) THEN
    ALTER TYPE subsystems_system_type_enum ADD VALUE IF NOT EXISTS 'LAN';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OTK' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subsystems_system_type_enum')) THEN
    ALTER TYPE subsystems_system_type_enum ADD VALUE IF NOT EXISTS 'OTK';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ZASILANIE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subsystems_system_type_enum')) THEN
    ALTER TYPE subsystems_system_type_enum ADD VALUE IF NOT EXISTS 'ZASILANIE';
  END IF;
END$$;

-- ============================================
-- 2. Aktualizacja tabel workflow_bom_template_items
-- ============================================

-- Dodaj kolumnę item_name jeśli nie istnieje (zmiana z name)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_bom_template_items' AND column_name = 'name') THEN
    ALTER TABLE workflow_bom_template_items RENAME COLUMN name TO item_name;
  END IF;
END$$;

-- Dodaj kolumnę requires_ip jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_bom_template_items' AND column_name = 'requires_ip') THEN
    ALTER TABLE workflow_bom_template_items ADD COLUMN requires_ip BOOLEAN DEFAULT FALSE;
  END IF;
END$$;

-- Zmień nazwę kolumny is_network_device na requires_ip jeśli istnieje
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_bom_template_items' AND column_name = 'is_network_device') THEN
    ALTER TABLE workflow_bom_template_items RENAME COLUMN is_network_device TO requires_ip;
  END IF;
END$$;

-- Zmień nazwę kolumny network_category na device_category
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_bom_template_items' AND column_name = 'network_category') THEN
    ALTER TABLE workflow_bom_template_items RENAME COLUMN network_category TO device_category;
  END IF;
END$$;

-- Usuń kolumnę requires_ip_address jeśli istnieje (zastąpiona przez requires_ip)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_bom_template_items' AND column_name = 'requires_ip_address') THEN
    ALTER TABLE workflow_bom_template_items DROP COLUMN requires_ip_address;
  END IF;
END$$;

-- Dodaj kolumnę sequence jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_bom_template_items' AND column_name = 'sequence') THEN
    ALTER TABLE workflow_bom_template_items ADD COLUMN sequence INTEGER DEFAULT 1;
  END IF;
END$$;

-- Ustaw part_number jako nullable
ALTER TABLE workflow_bom_template_items ALTER COLUMN part_number DROP NOT NULL;

-- ============================================
-- 3. Aktualizacja tabel workflow_generated_bom_items
-- ============================================

-- Dodaj kolumnę item_name jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_generated_bom_items' AND column_name = 'item_name') THEN
    ALTER TABLE workflow_generated_bom_items ADD COLUMN item_name VARCHAR(200);
  END IF;
END$$;

-- Dodaj kolumnę unit jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_generated_bom_items' AND column_name = 'unit') THEN
    ALTER TABLE workflow_generated_bom_items ADD COLUMN unit VARCHAR(20) DEFAULT 'szt';
  END IF;
END$$;

-- Dodaj kolumnę part_number jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_generated_bom_items' AND column_name = 'part_number') THEN
    ALTER TABLE workflow_generated_bom_items ADD COLUMN part_number VARCHAR(100);
  END IF;
END$$;

-- Dodaj kolumnę requires_ip jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_generated_bom_items' AND column_name = 'requires_ip') THEN
    ALTER TABLE workflow_generated_bom_items ADD COLUMN requires_ip BOOLEAN DEFAULT FALSE;
  END IF;
END$$;

-- Dodaj kolumnę device_category jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_generated_bom_items' AND column_name = 'device_category') THEN
    ALTER TABLE workflow_generated_bom_items ADD COLUMN device_category VARCHAR(20);
  END IF;
END$$;

-- Dodaj kolumnę sequence jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_generated_bom_items' AND column_name = 'sequence') THEN
    ALTER TABLE workflow_generated_bom_items ADD COLUMN sequence INTEGER DEFAULT 1;
  END IF;
END$$;

-- ============================================
-- 4. Aktualizacja tabel completion_items
-- ============================================

-- Dodaj kolumnę generated_bom_item_id jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'completion_items' AND column_name = 'generated_bom_item_id') THEN
    ALTER TABLE completion_items ADD COLUMN generated_bom_item_id INTEGER;
  END IF;
END$$;

-- Dodaj kolumnę expected_quantity jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'completion_items' AND column_name = 'expected_quantity') THEN
    ALTER TABLE completion_items ADD COLUMN expected_quantity INTEGER DEFAULT 0;
  END IF;
END$$;

-- ============================================
-- 5. Indeksy i komentarze
-- ============================================

-- Dodaj indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_workflow_bom_template_items_requires_ip ON workflow_bom_template_items(requires_ip);
CREATE INDEX IF NOT EXISTS idx_workflow_generated_bom_items_requires_ip ON workflow_generated_bom_items(requires_ip);
CREATE INDEX IF NOT EXISTS idx_completion_items_status ON completion_items(status);

-- Dodaj komentarze
COMMENT ON COLUMN workflow_bom_template_items.requires_ip IS 'Czy pozycja wymaga przypisania adresu IP';
COMMENT ON COLUMN workflow_bom_template_items.device_category IS 'Kategoria urządzenia sieciowego';
COMMENT ON COLUMN workflow_bom_template_items.sequence IS 'Kolejność wyświetlania w BOM';

COMMENT ON COLUMN workflow_generated_bom_items.item_name IS 'Nazwa pozycji z BOM';
COMMENT ON COLUMN workflow_generated_bom_items.requires_ip IS 'Czy pozycja wymaga przypisania adresu IP';
COMMENT ON COLUMN workflow_generated_bom_items.device_category IS 'Kategoria urządzenia sieciowego';

COMMENT ON COLUMN completion_items.expected_quantity IS 'Oczekiwana ilość do skompletowania';
COMMENT ON COLUMN completion_items.generated_bom_item_id IS 'ID pozycji wygenerowanego BOM';

-- ============================================
-- Koniec migracji
-- ============================================

SELECT 'Migracja 20260106_workflow_updates zakończona pomyślnie!' as status;
