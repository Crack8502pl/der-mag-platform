-- scripts/add-service-tasks.sql
-- Migracja: Dodanie typu zadania SERWIS i roli koordynator

-- Dodanie typu zadania SERWIS
INSERT INTO task_types (name, description, code, active, configuration, created_at, updated_at) VALUES
('Zadanie Serwisowe', 'Naprawa, konserwacja i interwencje serwisowe', 'SERWIS', true, '{"has_bom": true, "has_ip_config": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = EXCLUDED.active,
  configuration = EXCLUDED.configuration,
  updated_at = CURRENT_TIMESTAMP;

-- Dodanie roli koordynator z odpowiednimi uprawnieniami
INSERT INTO roles (name, description, permissions, created_at, updated_at) VALUES
('coordinator', 'Koordynator - zarządzanie zadaniami serwisowymi', '{
  "tasks": {
    "read": true,
    "update": true,
    "create": ["SERWIS"],
    "assign": true
  },
  "users": {
    "read": true
  },
  "activities": {
    "read": true,
    "update": true
  },
  "devices": {
    "read": true
  },
  "photos": {
    "read": true
  }
}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = CURRENT_TIMESTAMP;

-- Dodanie szablonów BOM dla zadań serwisowych
INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Kabel UTP Cat5e - 10m',
    'Kabel sieciowy UTP kategoria 5e, długość 10m',
    'szt',
    2,
    false,
    'Kable',
    'CABLE-UTP-CAT5E-10M',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Kabel UTP Cat5e - 20m',
    'Kabel sieciowy UTP kategoria 5e, długość 20m',
    'szt',
    2,
    false,
    'Kable',
    'CABLE-UTP-CAT5E-20M',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Kabel UTP Cat5e - 50m',
    'Kabel sieciowy UTP kategoria 5e, długość 50m',
    'szt',
    1,
    false,
    'Kable',
    'CABLE-UTP-CAT5E-50M',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Złączki RJ45',
    'Złączki RJ45 Cat5e/Cat6',
    'szt',
    10,
    false,
    'Złączki',
    'CONN-RJ45-CAT6',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Opaski zaciskowe 200mm',
    'Opaski zaciskowe plastikowe 200mm',
    'szt',
    50,
    false,
    'Opaski zaciskowe',
    'ZIP-TIE-200MM',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Opaski zaciskowe 300mm',
    'Opaski zaciskowe plastikowe 300mm',
    'szt',
    20,
    false,
    'Opaski zaciskowe',
    'ZIP-TIE-300MM',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Taśma izolacyjna',
    'Taśma izolacyjna PVC czarna',
    'szt',
    2,
    false,
    'Materiały eksploatacyjne',
    'TAPE-INSULATION',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Rękawiczki robocze',
    'Rękawiczki ochronne do pracy',
    'para',
    2,
    false,
    'Materiały eksploatacyjne',
    'GLOVES-WORK',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Śrubki montażowe M6',
    'Śrubki montażowe M6 z nakrętkami',
    'szt',
    10,
    false,
    'Materiały eksploatacyjne',
    'SCREW-M6-SET',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

INSERT INTO bom_templates (task_type_id, material_name, description, unit, default_quantity, is_serialized, category, part_number, active, created_at, updated_at)
SELECT 
    tt.id,
    'Kołki rozporowe',
    'Kołki rozporowe plastikowe z wkrętami',
    'szt',
    10,
    false,
    'Materiały eksploatacyjne',
    'DOWEL-PLASTIC',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

-- Dodanie przykładowych szablonów aktywności dla zadań serwisowych
INSERT INTO activity_templates (task_type_id, name, description, sequence, parent_id, requires_photo, min_photos, is_mandatory, configuration, active, created_at, updated_at)
SELECT 
    tt.id,
    'Diagnoza problemu',
    'Identyfikacja i diagnoza usterki lub problemu',
    1,
    NULL,
    true,
    1,
    true,
    '{}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

INSERT INTO activity_templates (task_type_id, name, description, sequence, parent_id, requires_photo, min_photos, is_mandatory, configuration, active, created_at, updated_at)
SELECT 
    tt.id,
    'Naprawa lub wymiana',
    'Wykonanie naprawy lub wymiany uszkodzonych elementów',
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
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

INSERT INTO activity_templates (task_type_id, name, description, sequence, parent_id, requires_photo, min_photos, is_mandatory, configuration, active, created_at, updated_at)
SELECT 
    tt.id,
    'Testy funkcjonalne',
    'Przeprowadzenie testów poprawności działania',
    3,
    NULL,
    false,
    0,
    true,
    '{}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

INSERT INTO activity_templates (task_type_id, name, description, sequence, parent_id, requires_photo, min_photos, is_mandatory, configuration, active, created_at, updated_at)
SELECT 
    tt.id,
    'Dokumentacja prac',
    'Sporządzenie dokumentacji wykonanych prac',
    4,
    NULL,
    true,
    1,
    true,
    '{}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM task_types tt
WHERE tt.code = 'SERWIS'
ON CONFLICT DO NOTHING;

-- Informacja o ukończeniu
SELECT 'Migracja zakończona pomyślnie - dodano typ zadania SERWIS, rolę koordynator i szablony BOM!' as status;
