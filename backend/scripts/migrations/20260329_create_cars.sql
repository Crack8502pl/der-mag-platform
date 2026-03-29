-- Migration: Create cars table
-- Date: 2026-03-29
-- Description: Creates the cars table for storing vehicles synced from Symfonia MSSQL

CREATE TABLE IF NOT EXISTS cars (
  id SERIAL PRIMARY KEY,
  symfonia_lp VARCHAR(20) UNIQUE NOT NULL,
  registration VARCHAR(20) NOT NULL,
  symfonia_element_id INTEGER,
  active BOOLEAN DEFAULT true,
  brigade_id INTEGER REFERENCES brigades(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP
);

-- Create indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_cars_symfonia_lp ON cars(symfonia_lp);
CREATE INDEX IF NOT EXISTS idx_cars_active ON cars(active);
CREATE INDEX IF NOT EXISTS idx_cars_brigade_id ON cars(brigade_id);

-- Add comments
COMMENT ON TABLE cars IS 'Samochody firmowe zsynchronizowane z Symfonii MSSQL';
COMMENT ON COLUMN cars.symfonia_lp IS 'Numer LP z Symfonii (np. S00144)';
COMMENT ON COLUMN cars.registration IS 'Numer rejestracyjny (wielkie litery, np. CB144RX)';
COMMENT ON COLUMN cars.symfonia_element_id IS 'ElementId z tabeli SSCommon.STElements';
COMMENT ON COLUMN cars.brigade_id IS 'FK do brygady powiązanej z samochodem (opcjonalne)';
COMMENT ON COLUMN cars.archived_at IS 'Data archiwizacji gdy samochód zniknie z Symfonii';
