-- scripts/seed-data.sql
-- Skrypt wypełnienia bazy danych początkowymi danymi

-- ============================================================================
-- 1. WSTAWIENIE RÓL (10 ról z granularnymi uprawnieniami)
-- ============================================================================
-- Skopiowane dokładnie z backend/src/services/DatabaseSeeder.ts (linie 39-211)

INSERT INTO roles (name, description, permissions, created_at, updated_at) VALUES
(
  'admin',
  'Administrator Systemu - Pełny dostęp do wszystkich funkcji systemu',
  '{"all": true}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'management_board',
  'Zarząd - Zarządzanie Menadżerami, przydzielanie projektów, raporty dobowe',
  '{
    "dashboard": {"read": true},
    "contracts": {"read": true, "create": true, "update": true, "approve": true, "import": true},
    "subsystems": {"read": true, "create": true, "update": true, "delete": true, "generateBom": true, "allocateNetwork": true, "uploadDocs": true, "deleteDocs": true},
    "tasks": {"read": true, "create": true, "update": true, "assign": true},
    "completion": {"read": true, "decideContinue": true},
    "prefabrication": {"read": true},
    "network": {"read": true, "createPool": true, "updatePool": true, "allocate": true, "viewMatrix": true},
    "bom": {"read": true, "create": true, "update": true},
    "devices": {"read": true, "create": true, "update": true},
    "users": {"read": true, "create": true, "update": true},
    "reports": {"read": true, "create": true, "export": true},
    "settings": {"read": true, "update": true},
    "photos": {"read": true, "approve": true},
    "documents": {"read": true, "create": true, "delete": true},
    "notifications": {"receiveAlerts": true, "sendManual": true}
  }'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'manager',
  'Menedżer - Zarządzanie projektami, użytkownikami i raportami',
  '{
    "dashboard": {"read": true},
    "contracts": {"read": true, "create": true, "update": true, "approve": true, "import": true},
    "subsystems": {"read": true, "create": true, "update": true, "delete": true, "generateBom": true, "allocateNetwork": true, "uploadDocs": true, "deleteDocs": true},
    "tasks": {"read": true, "create": true, "update": true, "assign": true},
    "completion": {"read": true, "decideContinue": true},
    "prefabrication": {"read": true},
    "network": {"read": true, "createPool": true, "updatePool": true, "allocate": true, "viewMatrix": true},
    "bom": {"read": true, "create": true, "update": true},
    "devices": {"read": true, "create": true, "update": true},
    "users": {"read": true},
    "reports": {"read": true, "create": true, "export": true},
    "settings": {"read": true, "update": true},
    "photos": {"read": true, "approve": true},
    "documents": {"read": true, "create": true, "delete": true},
    "notifications": {"receiveAlerts": true, "sendManual": true}
  }'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'coordinator',
  'Koordynator - Koordynacja zadań serwisowych, przypisywanie pracowników',
  '{
    "dashboard": {"read": true},
    "contracts": {"read": true},
    "subsystems": {"read": true},
    "tasks": {"read": true, "create": "SERWIS", "update": true, "assign": true},
    "completion": {"read": true},
    "prefabrication": {"read": true},
    "network": {"read": true, "viewMatrix": true},
    "bom": {"read": true},
    "devices": {"read": true},
    "users": {"read": true},
    "reports": {"read": true, "export": true},
    "settings": {"read": true, "update": true},
    "photos": {"read": true},
    "documents": {"read": true, "create": true},
    "notifications": {"receiveAlerts": true}
  }'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'bom_editor',
  'Edytor BOM-ów - Zarządzanie materiałami i szablonami BOM',
  '{
    "dashboard": {"read": true},
    "subsystems": {"read": true, "generateBom": true, "allocateNetwork": true},
    "tasks": {"read": true},
    "network": {"read": true, "allocate": true, "viewMatrix": true},
    "bom": {"read": true, "create": true, "update": true, "delete": true},
    "devices": {"read": true},
    "reports": {"read": true},
    "settings": {"read": true, "update": true},
    "documents": {"read": true},
    "notifications": {"receiveAlerts": true, "configureTriggers": true}
  }'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'prefabricator',
  'Prefabrykant - Prefabrykacja urządzeń, weryfikacja numerów seryjnych',
  '{
    "dashboard": {"read": true},
    "tasks": {"read": true},
    "completion": {"scan": true},
    "prefabrication": {"read": true, "receiveOrder": true, "configure": true, "verify": true, "assignSerial": true, "complete": true},
    "network": {"read": true, "viewMatrix": true},
    "bom": {"read": true},
    "devices": {"read": true, "create": true, "update": true, "verify": true},
    "settings": {"read": true, "update": true},
    "documents": {"read": true},
    "notifications": {"receiveAlerts": true}
  }'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'worker',
  'Pracownik - Realizacja zadań, kompletacja, upload zdjęć',
  '{
    "dashboard": {"read": true},
    "tasks": {"read": true, "update": "OWN"},
    "completion": {"read": true, "scan": true, "assignPallet": true, "reportMissing": true, "complete": true},
    "network": {"viewMatrix": true},
    "bom": {"read": true},
    "devices": {"read": true, "update": true},
    "settings": {"read": true, "update": true},
    "photos": {"read": true, "create": true},
    "documents": {"read": true},
    "notifications": {"receiveAlerts": true}
  }'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'order_picking',
  'Pracownik przygotowania - Kompletacja podzespołów, dodawanie numerów seryjnych',
  '{
    "dashboard": {"read": true},
    "tasks": {"read": true},
    "completion": {"read": true, "scan": true, "assignPallet": true, "reportMissing": true, "complete": true},
    "bom": {"read": true},
    "devices": {"read": true, "verify": true},
    "reports": {"read": true},
    "settings": {"read": true, "update": true},
    "photos": {"read": true, "create": true},
    "documents": {"read": true},
    "notifications": {"receiveAlerts": true, "sendManual": true}
  }'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'integrator',
  'System - Integruje z platformami zewnętrznymi',
  '{
    "contracts": {"read": true, "create": true, "update": true, "import": true},
    "bom": {"read": true, "update": true},
    "devices": {"read": true, "create": true, "update": true, "verify": true}
  }'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'viewer',
  'Podgląd - tylko odczyt wszystkich modułów',
  '{
    "dashboard": {"read": true},
    "contracts": {"read": true},
    "subsystems": {"read": true},
    "tasks": {"read": true},
    "completion": {"read": true},
    "prefabrication": {"read": true},
    "network": {"read": true, "viewMatrix": true},
    "bom": {"read": true},
    "devices": {"read": true},
    "users": {"read": true},
    "reports": {"read": true},
    "settings": {"read": true},
    "photos": {"read": true},
    "documents": {"read": true},
    "notifications": {"receiveAlerts": true}
  }'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. WSTAWIENIE TYPÓW ZADAŃ (13 typów zgodnych z SystemType enum)
-- ============================================================================

INSERT INTO task_types (name, description, code, active, configuration, created_at, updated_at) VALUES
('SMOK/CMOKIP-A', 'System monitorowania obiektów kolejowych - Wariant A/SKP', 'SMOKIP_A', true, '{"has_bom": true, "has_ip_config": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SMOK/CMOKIP-B', 'System monitorowania obiektów kolejowych - Wariant B', 'SMOKIP_B', true, '{"has_bom": true, "has_ip_config": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SKD', 'System Kontroli Dostępu', 'SKD', true, '{"has_bom": true, "has_ip_config": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SSWiN', 'System Sygnalizacji Włamania i Napadu', 'SSWIN', true, '{"has_bom": true, "has_ip_config": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('CCTV', 'System Telewizji Przemysłowej', 'CCTV', true, '{"has_bom": true, "has_ip_config": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SMW', 'System Monitoringu Wizyjnego', 'SMW', true, '{"has_bom": true, "has_ip_config": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SDIP', 'System Dynamicznej Informacji Pasażerskiej', 'SDIP', true, '{"has_bom": true, "has_ip_config": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SUG', 'Stałe Urządzenia Gaśnicze', 'SUG', true, '{"has_bom": true, "has_ip_config": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SSP', 'System Stwierdzenia Pożaru', 'SSP', true, '{"has_bom": true, "has_ip_config": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('LAN', 'Okablowanie LAN', 'LAN', true, '{"has_bom": true, "has_ip_config": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('OTK', 'Okablowanie OTK', 'OTK', true, '{"has_bom": true, "has_ip_config": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Zasilanie', 'Systemy zasilania', 'ZASILANIE', true, '{"has_bom": true, "has_ip_config": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Zadanie Serwisowe', 'Naprawa, konserwacja i interwencje serwisowe', 'SERWIS', true, '{"has_bom": true, "has_ip_config": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 3. WSTAWIENIE UŻYTKOWNIKA ADMINISTRATORA
-- ============================================================================
-- Hasło: Admin123! (zaszyfrowane bcryptem)

INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id, active, force_password_change, created_at, updated_at)
SELECT 
    'admin',
    'r.krakowski@der-mag.pl',
    '$2b$10$rKvDQmXyN5K5JZJr5t.Hku7FNxdqr5v5qPQx0ZjVX.8vO6J9Uk8Hm',
    'Administrator',
    'Systemu',
    '+48123456789',
    r.id,
    true,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM roles r
WHERE r.name = 'admin'
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- 4. PRZYKŁADOWE PULE IP DLA RÓŻNYCH TYPÓW ZADAŃ
-- ============================================================================

INSERT INTO ip_pools (task_type_id, name, cidr, network_address, subnet_mask, first_ip, last_ip, total_addresses, allocated_addresses, description, active, created_at, updated_at)
SELECT 
    tt.id,
    'Pula SMW - 192.168.10.0/24',
    '192.168.10.0/24',
    '192.168.10.0',
    '255.255.255.0',
    '192.168.10.1',
    '192.168.10.254',
    254,
    '[]'::jsonb,
    'Pula adresów IP dla systemów monitoringu wizyjnego',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SMW'
ON CONFLICT DO NOTHING;

INSERT INTO ip_pools (task_type_id, name, cidr, network_address, subnet_mask, first_ip, last_ip, total_addresses, allocated_addresses, description, active, created_at, updated_at)
SELECT 
    tt.id,
    'Pula SDIP - 192.168.20.0/24',
    '192.168.20.0/24',
    '192.168.20.0',
    '255.255.255.0',
    '192.168.20.1',
    '192.168.20.254',
    254,
    '[]'::jsonb,
    'Pula adresów IP dla systemów SDIP',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SDIP'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. PRZYKŁADOWE SZABLONY BOM DLA SMW
-- ============================================================================
INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Kamera IP 2MP',
    'Kamera IP 2 megapiksele z IR do 30m',
    'szt',
    4,
    true,
    'Kamery',
    'CAM-IP-2MP-IR30',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SMW'
ON CONFLICT DO NOTHING;

INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Rejestrator IP 8 kanałowy',
    'Rejestrator sieciowy NVR 8 kanałów',
    'szt',
    1,
    true,
    'Rejestratory',
    'NVR-8CH',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SMW'
ON CONFLICT DO NOTHING;

INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Kabel UTP Cat6',
    'Kabel sieciowy UTP kategoria 6',
    'm',
    100,
    false,
    'Okablowanie',
    'UTP-CAT6',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SMW'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. PRZYKŁADOWE SZABLONY AKTYWNOŚCI DLA SMW
-- ============================================================================
INSERT INTO activity_templates (task_type_id, name, description, sequence, parent_id, requires_photo, min_photos, is_mandatory, configuration, active, created_at, updated_at)
SELECT 
    tt.id,
    'Przygotowanie dokumentacji projektowej',
    'Przygotowanie i weryfikacja dokumentacji technicznej',
    1,
    NULL,
    false,
    0,
    true,
    '{}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SMW'
ON CONFLICT DO NOTHING;

INSERT INTO activity_templates (task_type_id, name, description, sequence, parent_id, requires_photo, min_photos, is_mandatory, configuration, active, created_at, updated_at)
SELECT 
    tt.id,
    'Montaż kamer',
    'Instalacja kamer w wyznaczonych lokalizacjach',
    2,
    NULL,
    true,
    2,
    true,
    '{}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SMW'
ON CONFLICT DO NOTHING;

INSERT INTO activity_templates (task_type_id, name, description, sequence, parent_id, requires_photo, min_photos, is_mandatory, configuration, active, created_at, updated_at)
SELECT 
    tt.id,
    'Okablowanie',
    'Wykonanie okablowania strukturalnego',
    3,
    NULL,
    true,
    1,
    true,
    '{}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SMW'
ON CONFLICT DO NOTHING;

INSERT INTO activity_templates (task_type_id, name, description, sequence, parent_id, requires_photo, min_photos, is_mandatory, configuration, active, created_at, updated_at)
SELECT 
    tt.id,
    'Konfiguracja systemu',
    'Konfiguracja rejestratora i kamer',
    4,
    NULL,
    false,
    0,
    true,
    '{}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SMW'
ON CONFLICT DO NOTHING;

INSERT INTO activity_templates (task_type_id, name, description, sequence, parent_id, requires_photo, min_photos, is_mandatory, configuration, active, created_at, updated_at)
SELECT 
    tt.id,
    'Testy i odbiór',
    'Przeprowadzenie testów i odbioru systemu',
    5,
    NULL,
    true,
    3,
    true,
    '{}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SMW'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INFORMACJA O UKOŃCZENIU
-- ============================================================================
SELECT 'Dane seed zostały pomyślnie załadowane!' as status;
