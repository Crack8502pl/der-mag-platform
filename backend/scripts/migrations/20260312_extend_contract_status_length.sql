-- Migration: Extend contract status column length
-- Date: 2026-03-12
-- Description: Zwiększa długość kolumny status w tabeli contracts z 20 do 30 znaków
--              aby pomieścić nowy status PENDING_CONFIGURATION (21 znaków)

BEGIN;

-- ============================================
-- ZMIANA DŁUGOŚCI KOLUMNY STATUS
-- ============================================

-- Zwiększ długość kolumny status z varchar(20) do varchar(30)
ALTER TABLE contracts 
ALTER COLUMN status TYPE VARCHAR(30);

-- Dodaj komentarz wyjaśniający
COMMENT ON COLUMN contracts.status IS 'Status kontraktu: CREATED, PENDING_CONFIGURATION, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED, ACTIVE, INACTIVE';

-- ============================================
-- AKTUALIZACJA ISTNIEJĄCYCH KONTRAKTÓW Z MSSQL
-- ============================================

-- Zmień status ACTIVE na PENDING_CONFIGURATION dla kontraktów zaimportowanych z Symfonii
-- (te które mają technical_specs z symfonia_element_id)
UPDATE contracts 
SET status = 'PENDING_CONFIGURATION', 
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'ACTIVE' 
  AND technical_specs IS NOT NULL 
  AND technical_specs->>'symfonia_element_id' IS NOT NULL;

-- ============================================
-- WERYFIKACJA
-- ============================================

DO $$
DECLARE
    pending_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pending_count 
    FROM contracts 
    WHERE status = 'PENDING_CONFIGURATION';
    
    RAISE NOTICE '✅ Migracja zakończona pomyślnie';
    RAISE NOTICE '📊 Kontraktów ze statusem PENDING_CONFIGURATION: %', pending_count;
END $$;

COMMIT;
