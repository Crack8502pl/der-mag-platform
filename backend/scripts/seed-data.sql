-- scripts/seed-data.sql
-- Skrypt wypełnienia bazy danych początkowymi danymi

-- Wstawienie ról
INSERT INTO roles (name, description, permissions, created_at, updated_at) VALUES
('admin', 'Administrator systemu z pełnymi uprawnieniami', '{"all": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('manager', 'Menedżer projektów - zarządzanie zadaniami i użytkownikami', '{"tasks": true, "users": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('technician', 'Technik terenowy - wykonywanie zadań', '{"tasks": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('viewer', 'Podgląd systemu bez możliwości edycji', '{"read": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Wstawienie typów zadań
INSERT INTO task_types (name, description, code, active, configuration, created_at, updated_at) VALUES
('System Monitoringu Wizyjnego', 'SMW - System Monitoringu Wizyjnego', 'SMW', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('CSDIP', 'Cyfrowe Systemy Dźwiękowego Informowania Pasażerów', 'CSDIP', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('LAN PKP PLK', 'Sieci LAN PKP PLK', 'LAN_PKP_PLK', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SMOK-IP/CMOK-IP (Wariant A/SKP)', 'System monitorowania obiektów kolejowych - Wariant A', 'SMOK_IP_A', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SMOK-IP/CMOK-IP (Wariant B)', 'System monitorowania obiektów kolejowych - Wariant B', 'SMOK_IP_B', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SSWiN', 'System Sygnalizacji Włamania i Napadu', 'SSWIN', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SSP', 'System Sygnalizacji Pożaru', 'SSP', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SUG', 'Stałe Urządzenie Gaśnicze', 'SUG', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Obiekty Kubaturowe', 'Obiekty budowlane kubaturowe', 'OBIEKTY_KUBATUROWE', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Kontrakty Liniowe', 'Kontrakty liniowe kolejowe', 'KONTRAKTY_LINIOWE', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('LAN Strukturalny Miedziana', 'LAN Strukturalny - okablowanie miedziane', 'LAN_STRUKTURALNY', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Zasilania', 'Systemy zasilania', 'ZASILANIA', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Struktury Światłowodowe', 'Infrastruktura światłowodowa', 'STRUKTURY_SWIATLO', true, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Wstawienie przykładowego użytkownika administratora
-- Hasło: Admin123! (zaszyfrowane bcryptem)
INSERT INTO users (username, email, password, first_name, last_name, phone, role_id, active, created_at, updated_at)
SELECT 
    'admin',
    'admin@dermag.lan',
    '$2b$10$rKvDQmXyN5K5JZJr5t.Hku7FNxdqr5v5qPQx0ZjVX.8vO6J9Uk8Hm',
    'Administrator',
    'Systemu',
    '+48123456789',
    r.id,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM roles r
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Przykładowe pule IP dla różnych typów zadań
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
    'Pula CSDIP - 192.168.20.0/24',
    '192.168.20.0/24',
    '192.168.20.0',
    '255.255.255.0',
    '192.168.20.1',
    '192.168.20.254',
    254,
    '[]'::jsonb,
    'Pula adresów IP dla systemów CSDIP',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'CSDIP'
ON CONFLICT DO NOTHING;

-- Przykładowe szablony BOM dla SMW
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

-- Przykładowe szablony aktywności dla SMW
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

-- Informacja o ukończeniu
SELECT 'Dane seed zostały pomyślnie załadowane!' as status;
