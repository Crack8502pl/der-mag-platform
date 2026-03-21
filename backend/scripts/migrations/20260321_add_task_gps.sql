-- Migracja: Dodanie pól GPS do zadań
-- Data: 2026-03-21

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS gps_latitude DECIMAL(10, 7) NULL,
ADD COLUMN IF NOT EXISTS gps_longitude DECIMAL(10, 7) NULL,
ADD COLUMN IF NOT EXISTS google_maps_url VARCHAR(500) NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_gps ON tasks(gps_latitude, gps_longitude) WHERE gps_latitude IS NOT NULL;

COMMENT ON COLUMN tasks.gps_latitude IS 'Szerokość geograficzna zadania';
COMMENT ON COLUMN tasks.gps_longitude IS 'Długość geograficzna zadania';
COMMENT ON COLUMN tasks.google_maps_url IS 'Link do Google Maps (źródłowy)';
