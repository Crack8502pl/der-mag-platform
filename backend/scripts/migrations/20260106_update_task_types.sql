-- Migracja: Aktualizacja kodów task_types do zgodności z SystemType enum
-- Data: 2026-01-06
-- Opis: Aktualizacja kodów zadań, usunięcie przestarzałych typów, dodanie SERWIS

-- ============================================================================
-- 1. AKTUALIZACJA ISTNIEJĄCYCH KODÓW
-- ============================================================================

UPDATE task_types SET code = 'SMOKIP_A' WHERE code = 'SMOK_IP_A';
UPDATE task_types SET code = 'SMOKIP_B' WHERE code = 'SMOK_IP_B';
UPDATE task_types SET code = 'SDIP' WHERE code = 'CSDIP';
UPDATE task_types SET code = 'LAN' WHERE code IN ('LAN_PKP_PLK', 'LAN_STRUKTURALNY');
UPDATE task_types SET code = 'OTK' WHERE code = 'STRUKTURY_SWIATLO';
UPDATE task_types SET code = 'ZASILANIE' WHERE code = 'ZASILANIA';

-- ============================================================================
-- 2. USUNIĘCIE ZBĘDNYCH TYPÓW
-- ============================================================================

DELETE FROM task_types WHERE code IN ('OBIEKTY_KUBATUROWE', 'KONTRAKTY_LINIOWE');

-- ============================================================================
-- 3. DODANIE SERWIS JEŚLI NIE ISTNIEJE
-- ============================================================================

INSERT INTO task_types (name, description, code, active, configuration, created_at, updated_at)
VALUES ('Zadanie Serwisowe', 'Naprawa, konserwacja i interwencje serwisowe', 'SERWIS', true, '{"has_bom": true, "has_ip_config": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. DODANIE BRAKUJĄCYCH TYPÓW JEŚLI NIE ISTNIEJĄ
-- ============================================================================

INSERT INTO task_types (name, description, code, active, configuration, created_at, updated_at)
VALUES 
('SKD', 'System Kontroli Dostępu', 'SKD', true, '{"has_bom": true, "has_ip_config": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('CCTV', 'System Telewizji Przemysłowej', 'CCTV', true, '{"has_bom": true, "has_ip_config": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PODSUMOWANIE
-- ============================================================================

SELECT 'Migracja task_types zakończona pomyślnie!' as status;
SELECT code, name FROM task_types ORDER BY code;
