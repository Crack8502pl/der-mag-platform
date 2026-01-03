-- scripts/migrations/20260102_full_permissions_sync.sql
-- Migracja: Pełny system uprawnień na podstawie XML
-- Data: 2026-01-02
-- Implementuje 9 ról, 15 modułów, 27 akcji

-- ============================================
-- KROK 1: Aktualizacja istniejących ról
-- ============================================

-- 1. Admin - pełny dostęp
UPDATE roles 
SET 
  description = 'Administrator Systemu - Pełny dostęp do wszystkich funkcji systemu',
  permissions = jsonb_build_object('all', true)
WHERE name = 'admin';

-- 2. Manager - zaktualizowany z pełnymi uprawnieniami
UPDATE roles 
SET 
  description = 'Menedżer - Zarządzanie projektami, użytkownikami i raportami',
  permissions = jsonb_build_object(
    'dashboard', jsonb_build_object('read', true),
    'contracts', jsonb_build_object(
      'read', true, 'create', true, 'update', true, 'delete', false, 'approve', true, 'import', true
    ),
    'subsystems', jsonb_build_object(
      'read', true, 'create', true, 'update', true, 'delete', false, 
      'generateBom', true, 'allocateNetwork', true
    ),
    'tasks', jsonb_build_object(
      'read', true, 'create', true, 'update', true, 'delete', false, 'assign', true
    ),
    'completion', jsonb_build_object(
      'read', true, 'decideContinue', true
    ),
    'prefabrication', jsonb_build_object('read', true),
    'network', jsonb_build_object(
      'read', true, 'createPool', true, 'updatePool', true, 'deletePool', false,
      'allocate', true, 'viewMatrix', true
    ),
    'bom', jsonb_build_object(
      'read', true, 'create', true, 'update', true, 'delete', false
    ),
    'devices', jsonb_build_object(
      'read', true, 'create', true, 'update', true, 'verify', false
    ),
    'users', jsonb_build_object(
      'read', true, 'create', false, 'update', false, 'delete', false
    ),
    'reports', jsonb_build_object(
      'read', true, 'create', true, 'export', true
    ),
    'settings', jsonb_build_object('read', true, 'update', true),
    'photos', jsonb_build_object(
      'read', true, 'create', false, 'approve', true
    ),
    'documents', jsonb_build_object(
      'read', true, 'create', true, 'delete', true
    ),
    'notifications', jsonb_build_object(
      'receiveAlerts', true, 'sendManual', true, 'configureTriggers', false
    )
  )
WHERE name = 'manager';

-- 3. Coordinator - zaktualizowany
UPDATE roles 
SET 
  description = 'Koordynator - Koordynacja zadań serwisowych, przypisywanie pracowników',
  permissions = jsonb_build_object(
    'dashboard', jsonb_build_object('read', true),
    'contracts', jsonb_build_object('read', true),
    'subsystems', jsonb_build_object('read', true),
    'tasks', jsonb_build_object(
      'read', true, 
      'create', 'SERWIS',  -- Tylko zadania serwisowe
      'update', true, 
      'assign', true
    ),
    'completion', jsonb_build_object('read', true),
    'prefabrication', jsonb_build_object('read', true),
    'network', jsonb_build_object(
      'read', true, 'viewMatrix', true
    ),
    'bom', jsonb_build_object('read', true),
    'devices', jsonb_build_object('read', true),
    'users', jsonb_build_object('read', true),
    'reports', jsonb_build_object('read', true, 'export', true),
    'settings', jsonb_build_object('read', true, 'update', true),
    'photos', jsonb_build_object('read', true),
    'documents', jsonb_build_object('read', true, 'create', true),
    'notifications', jsonb_build_object(
      'receiveAlerts', true, 'sendManual', false, 'configureTriggers', false
    )
  )
WHERE name = 'coordinator';

-- 4. Worker - zaktualizowany z pełnymi uprawnieniami
UPDATE roles 
SET 
  description = 'Pracownik - Realizacja zadań, kompletacja, upload zdjęć',
  permissions = jsonb_build_object(
    'dashboard', jsonb_build_object('read', true),
    'tasks', jsonb_build_object(
      'read', true,
      'update', 'OWN'  -- Tylko własne zadania
    ),
    'completion', jsonb_build_object(
      'read', true, 'scan', true, 'assignPallet', true, 
      'reportMissing', true, 'complete', true
    ),
    'network', jsonb_build_object('viewMatrix', true),
    'bom', jsonb_build_object('read', true),
    'devices', jsonb_build_object(
      'read', true, 'update', true
    ),
    'settings', jsonb_build_object('read', true, 'update', true),
    'photos', jsonb_build_object('read', true, 'create', true),
    'documents', jsonb_build_object('read', true),
    'notifications', jsonb_build_object('receiveAlerts', true)
  )
WHERE name = 'worker';

-- ============================================
-- KROK 2: Utworzenie nowych ról
-- ============================================

DO $$
BEGIN
  -- Management Board - Zarząd
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'management_board') THEN
    INSERT INTO roles (name, description, permissions)
    VALUES (
      'management_board', 
      'Zarząd - Zarządzanie Menadżerami, przydzielanie projektów, raporty dobowe',
      jsonb_build_object(
        'dashboard', jsonb_build_object('read', true),
        'contracts', jsonb_build_object(
          'read', true, 'create', true, 'update', true, 'approve', true, 'import', true
        ),
        'subsystems', jsonb_build_object(
          'read', true, 'create', true, 'update', true, 'generateBom', true, 'allocateNetwork', true
        ),
        'tasks', jsonb_build_object(
          'read', true, 'create', true, 'update', true, 'assign', true
        ),
        'completion', jsonb_build_object(
          'read', true, 'decideContinue', true
        ),
        'prefabrication', jsonb_build_object('read', true),
        'network', jsonb_build_object(
          'read', true, 'createPool', true, 'updatePool', true, 
          'allocate', true, 'viewMatrix', true
        ),
        'bom', jsonb_build_object(
          'read', true, 'create', true, 'update', true
        ),
        'devices', jsonb_build_object(
          'read', true, 'create', true, 'update', true
        ),
        'users', jsonb_build_object(
          'read', true, 'create', true, 'update', true
        ),
        'reports', jsonb_build_object(
          'read', true, 'create', true, 'export', true
        ),
        'settings', jsonb_build_object('read', true, 'update', true),
        'photos', jsonb_build_object(
          'read', true, 'approve', true
        ),
        'documents', jsonb_build_object(
          'read', true, 'create', true, 'delete', true
        ),
        'notifications', jsonb_build_object(
          'receiveAlerts', true, 'sendManual', true
        )
      )
    );
  END IF;

  -- BOM Editor - Edytor BOM-ów
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'bom_editor') THEN
    INSERT INTO roles (name, description, permissions)
    VALUES (
      'bom_editor', 
      'Edytor BOM-ów - Zarządzanie materiałami i szablonami BOM',
      jsonb_build_object(
        'dashboard', jsonb_build_object('read', true),
        'subsystems', jsonb_build_object(
          'read', true, 'generateBom', true, 'allocateNetwork', true
        ),
        'tasks', jsonb_build_object('read', true),
        'network', jsonb_build_object(
          'read', true, 'allocate', true, 'viewMatrix', true
        ),
        'bom', jsonb_build_object(
          'read', true, 'create', true, 'update', true, 'delete', true
        ),
        'devices', jsonb_build_object('read', true),
        'reports', jsonb_build_object('read', true),
        'settings', jsonb_build_object('read', true, 'update', true),
        'documents', jsonb_build_object('read', true),
        'notifications', jsonb_build_object(
          'receiveAlerts', true, 'configureTriggers', true
        )
      )
    );
  END IF;

  -- Prefabricator - Prefabrykant
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'prefabricator') THEN
    INSERT INTO roles (name, description, permissions)
    VALUES (
      'prefabricator', 
      'Prefabrykant - Prefabrykacja urządzeń, weryfikacja numerów seryjnych',
      jsonb_build_object(
        'dashboard', jsonb_build_object('read', true),
        'tasks', jsonb_build_object('read', true),
        'completion', jsonb_build_object('scan', true),
        'prefabrication', jsonb_build_object(
          'read', true, 'receiveOrder', true, 'configure', true, 
          'verify', true, 'assignSerial', true, 'complete', true
        ),
        'network', jsonb_build_object(
          'read', true, 'viewMatrix', true
        ),
        'bom', jsonb_build_object('read', true),
        'devices', jsonb_build_object(
          'read', true, 'create', true, 'update', true, 'verify', true
        ),
        'settings', jsonb_build_object('read', true, 'update', true),
        'documents', jsonb_build_object('read', true),
        'notifications', jsonb_build_object('receiveAlerts', true)
      )
    );
  END IF;

  -- Order Picking - Pracownik przygotowania
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'order_picking') THEN
    INSERT INTO roles (name, description, permissions)
    VALUES (
      'order_picking', 
      'Pracownik przygotowania - Kompletacja podzespołów, dodawanie numerów seryjnych',
      jsonb_build_object(
        'dashboard', jsonb_build_object('read', true),
        'tasks', jsonb_build_object('read', true),
        'completion', jsonb_build_object(
          'read', true, 'scan', true, 'assignPallet', true, 
          'reportMissing', true, 'complete', true
        ),
        'bom', jsonb_build_object('read', true),
        'devices', jsonb_build_object(
          'read', true, 'verify', true
        ),
        'reports', jsonb_build_object('read', true),
        'settings', jsonb_build_object('read', true, 'update', true),
        'photos', jsonb_build_object('read', true, 'create', true),
        'documents', jsonb_build_object('read', true),
        'notifications', jsonb_build_object(
          'receiveAlerts', true, 'sendManual', true
        )
      )
    );
  END IF;

  -- Integrator - System
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'integrator') THEN
    INSERT INTO roles (name, description, permissions)
    VALUES (
      'integrator', 
      'System - Integruje z platformami zewnętrznymi',
      jsonb_build_object(
        'contracts', jsonb_build_object(
          'read', true, 'create', true, 'update', true, 'import', true
        ),
        'bom', jsonb_build_object(
          'read', true, 'update', true
        ),
        'devices', jsonb_build_object(
          'read', true, 'create', true, 'update', true, 'verify', true
        )
      )
    );
  END IF;

END $$;

-- ============================================
-- KROK 3: Usunięcie nieużywanych ról (opcjonalnie)
-- ============================================

-- Jeśli istnieją stare role, które nie są już używane
-- UPDATE roles SET active = false WHERE name IN ('technician', 'viewer');

-- ============================================
-- KROK 4: Dodanie komentarzy
-- ============================================

COMMENT ON COLUMN roles.permissions IS 'Granularne uprawnienia JSONB zgodnie z pełną matrycą uprawnień XML';

-- ============================================
-- KROK 5: Podsumowanie
-- ============================================

DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM roles WHERE name IN (
    'admin', 'management_board', 'manager', 'coordinator', 
    'bom_editor', 'prefabricator', 'worker', 'order_picking', 'integrator'
  );
  
  RAISE NOTICE '✅ Migracja zakończona pomyślnie!';
  RAISE NOTICE '   Liczba ról w systemie: %', role_count;
  RAISE NOTICE '   Moduły: 15 (dashboard, contracts, subsystems, tasks, completion, prefabrication, network, bom, devices, users, reports, settings, photos, documents, notifications)';
  RAISE NOTICE '   Akcje: 27 (read, create, update, delete, approve, assign, scan, export, import, verify, configure, complete, viewMatrix, allocate, generateBom, receiveAlerts, sendManual, allocateNetwork, assignPallet, assignSerial, configureTriggers, createPool, decideContinue, deletePool, receiveOrder, reportMissing, updatePool)';
END $$;
