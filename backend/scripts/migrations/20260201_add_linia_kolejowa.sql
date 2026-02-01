-- Migration: Add linia_kolejowa column to contracts table
-- Description: Optional railway line field (format: LK-221, E-20)
-- Date: 2026-02-01

-- Add column
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS linia_kolejowa VARCHAR(20) DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN contracts.linia_kolejowa IS 'Linia kolejowa w formacie LK-XXX lub E-XX (opcjonalne)';

-- Create index for potential filtering
CREATE INDEX IF NOT EXISTS idx_contracts_linia_kolejowa ON contracts(linia_kolejowa) WHERE linia_kolejowa IS NOT NULL;
