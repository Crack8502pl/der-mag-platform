-- ============================================
-- MIGRACJA: Dodaj uprawnienia dla modułu Brigades
-- Data: 2026-01-08
-- 
-- UPRAWNIENIA:
-- - Admin: pełny dostęp (wszystko)
-- - Coordinator: pełny dostęp (wszystko jak admin)
-- - Manager: TYLKO odczyt (read + viewMembers)
-- - Pozostałe role: tylko odczyt
-- ============================================

-- Admin - pełny dostęp
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{brigades}',
  '{"read": true, "create": true, "update": true, "delete": true, "assignMembers": true, "viewMembers": true}'::jsonb
)
WHERE name = 'admin';

-- Coordinator - pełny dostęp (JAK ADMIN)
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{brigades}',
  '{"read": true, "create": true, "update": true, "delete": true, "assignMembers": true, "viewMembers": true}'::jsonb
)
WHERE name = 'coordinator';

-- Manager - TYLKO odczyt (bez tworzenia, edycji, usuwania, przypisywania)
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{brigades}',
  '{"read": true, "create": false, "update": false, "delete": false, "assignMembers": false, "viewMembers": true}'::jsonb
)
WHERE name = 'manager';

-- BOM Editor - tylko odczyt
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{brigades}',
  '{"read": true, "create": false, "update": false, "delete": false, "assignMembers": false, "viewMembers": true}'::jsonb
)
WHERE name = 'bom_editor';

-- Warehouse Manager - tylko odczyt
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{brigades}',
  '{"read": true, "create": false, "update": false, "delete": false, "assignMembers": false, "viewMembers": true}'::jsonb
)
WHERE name = 'warehouse_manager';

-- Worker - tylko odczyt
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{brigades}',
  '{"read": true, "create": false, "update": false, "delete": false, "assignMembers": false, "viewMembers": true}'::jsonb
)
WHERE name = 'worker';

-- Order Picking - tylko odczyt
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{brigades}',
  '{"read": true, "create": false, "update": false, "delete": false, "assignMembers": false, "viewMembers": true}'::jsonb
)
WHERE name = 'order_picking';

-- Prefabricator - tylko odczyt
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{brigades}',
  '{"read": true, "create": false, "update": false, "delete": false, "assignMembers": false, "viewMembers": true}'::jsonb
)
WHERE name = 'prefabricator';

-- Viewer - tylko odczyt
UPDATE roles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{brigades}',
  '{"read": true, "create": false, "update": false, "delete": false, "assignMembers": false, "viewMembers": true}'::jsonb
)
WHERE name = 'viewer';

-- ============================================
-- WERYFIKACJA ZMIAN
-- ============================================

\echo ''
\echo '================================================='
\echo '📊 UPRAWNIENIA BRYGAD - FINALNA KONFIGURACJA'
\echo '================================================='
\echo ''

SELECT 
  name as "Rola",
  permissions->'brigades'->>'read' as "Odczyt",
  permissions->'brigades'->>'create' as "Tworzenie",
  permissions->'brigades'->>'update' as "Edycja",
  permissions->'brigades'->>'delete' as "Usuwanie",
  permissions->'brigades'->>'assignMembers' as "Przypisywanie",
  permissions->'brigades'->>'viewMembers' as "Podgląd"
FROM roles
ORDER BY 
  CASE name
    WHEN 'admin' THEN 1
    WHEN 'coordinator' THEN 2
    WHEN 'manager' THEN 3
    ELSE 4
  END,
  name;

\echo ''
\echo '✅ Migracja zakończona pomyślnie!'
\echo ''
\echo 'UWAGA: Wyloguj się i zaloguj ponownie, aby odświeżyć uprawnienia w tokenie JWT.'
\echo ''
