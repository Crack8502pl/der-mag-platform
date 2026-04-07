-- Migration: Add alternative employee code columns to users table
-- Allows users to have up to 3 alternative codes (e.g. old codes after name change)
-- Used by SymfoniaContractSyncService to match contracts by any code

ALTER TABLE users
ADD COLUMN alt_employee_code_1 VARCHAR(5),
ADD COLUMN alt_employee_code_2 VARCHAR(5),
ADD COLUMN alt_employee_code_3 VARCHAR(5);

-- Partial unique indexes (enforce uniqueness only for NOT NULL values, per-column)
CREATE UNIQUE INDEX idx_users_alt_code_1
ON users (alt_employee_code_1)
WHERE alt_employee_code_1 IS NOT NULL;

CREATE UNIQUE INDEX idx_users_alt_code_2
ON users (alt_employee_code_2)
WHERE alt_employee_code_2 IS NOT NULL;

CREATE UNIQUE INDEX idx_users_alt_code_3
ON users (alt_employee_code_3)
WHERE alt_employee_code_3 IS NOT NULL;

-- DB-level trigger: enforce global uniqueness across all four employee code columns
-- (per-column indexes cannot prevent employee_code of one user equalling alt_employee_code_* of another)
CREATE OR REPLACE FUNCTION validate_users_employee_codes_global_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
    new_codes TEXT[];
    distinct_count INTEGER;
BEGIN
    -- Collect all non-null codes for this row
    new_codes := ARRAY(
        SELECT code
        FROM unnest(ARRAY[
            NEW.employee_code,
            NEW.alt_employee_code_1,
            NEW.alt_employee_code_2,
            NEW.alt_employee_code_3
        ]) AS code
        WHERE code IS NOT NULL
    );

    -- Prevent duplicate codes within the same row
    SELECT COUNT(DISTINCT code) INTO distinct_count FROM unnest(new_codes) AS code;
    IF distinct_count <> COALESCE(array_length(new_codes, 1), 0) THEN
        RAISE EXCEPTION 'Kody pracownika muszą być unikalne (duplikat w obrębie tego samego użytkownika)';
    END IF;

    -- Prevent code collision with any code column in other rows
    IF EXISTS (
        SELECT 1 FROM users u
        WHERE u.id <> NEW.id
          AND (
              u.employee_code      = ANY(new_codes)
              OR u.alt_employee_code_1 = ANY(new_codes)
              OR u.alt_employee_code_2 = ANY(new_codes)
              OR u.alt_employee_code_3 = ANY(new_codes)
          )
    ) THEN
        RAISE EXCEPTION 'Kod pracownika jest już używany przez innego użytkownika';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_validate_employee_codes_global_uniqueness
BEFORE INSERT OR UPDATE OF employee_code, alt_employee_code_1, alt_employee_code_2, alt_employee_code_3
ON users
FOR EACH ROW
EXECUTE FUNCTION validate_users_employee_codes_global_uniqueness();

COMMENT ON COLUMN users.alt_employee_code_1 IS 'Alternatywny kod pracownika #1 (np. stary kod przed zmianą nazwiska)';
COMMENT ON COLUMN users.alt_employee_code_2 IS 'Alternatywny kod pracownika #2 (opcjonalny)';
COMMENT ON COLUMN users.alt_employee_code_3 IS 'Alternatywny kod pracownika #3 (opcjonalny)';
