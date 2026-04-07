-- Migration: Add alternative employee code columns to users table
-- Allows users to have up to 3 alternative codes (e.g. old codes after name change)
-- Used by SymfoniaContractSyncService to match contracts by any code

ALTER TABLE users
ADD COLUMN alt_employee_code_1 VARCHAR(5),
ADD COLUMN alt_employee_code_2 VARCHAR(5),
ADD COLUMN alt_employee_code_3 VARCHAR(5);

-- Partial unique indexes (enforce uniqueness only for NOT NULL values)
CREATE UNIQUE INDEX idx_users_alt_code_1
ON users (alt_employee_code_1)
WHERE alt_employee_code_1 IS NOT NULL;

CREATE UNIQUE INDEX idx_users_alt_code_2
ON users (alt_employee_code_2)
WHERE alt_employee_code_2 IS NOT NULL;

CREATE UNIQUE INDEX idx_users_alt_code_3
ON users (alt_employee_code_3)
WHERE alt_employee_code_3 IS NOT NULL;

COMMENT ON COLUMN users.alt_employee_code_1 IS 'Alternatywny kod pracownika #1 (np. stary kod przed zmianą nazwiska)';
COMMENT ON COLUMN users.alt_employee_code_2 IS 'Alternatywny kod pracownika #2 (opcjonalny)';
COMMENT ON COLUMN users.alt_employee_code_3 IS 'Alternatywny kod pracownika #3 (opcjonalny)';
