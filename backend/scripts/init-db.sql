-- scripts/init-db.sql
-- Skrypt inicjalizacji bazy danych PostgreSQL dla Der-Mag Platform

-- Tworzenie bazy danych (jeśli nie istnieje)
-- CREATE DATABASE dermag_platform;

-- Rozszerzenia PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Komentarz informacyjny
COMMENT ON DATABASE dermag_platform IS 'Baza danych platformy Der-Mag - system zarządzania zadaniami infrastrukturalnymi';

-- Utworzenie użytkownika bazy danych (jeśli nie istnieje)
-- CREATE USER dermag_user WITH PASSWORD 'change-me-in-production';
-- GRANT ALL PRIVILEGES ON DATABASE dermag_platform TO dermag_user;

-- Funkcja aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
