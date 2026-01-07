-- Migration: Create service_tasks and service_task_activities tables
-- Date: 2026-01-07
-- Description: Creates tables for service task management

-- Create enum type for service task variant
DO $$ BEGIN
  CREATE TYPE service_task_variant AS ENUM ('REKLAMACJA', 'GWARANCYJNY', 'POGWARANCYJNY', 'BEZGWARANCYJNY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create service_tasks table
CREATE TABLE IF NOT EXISTS service_tasks (
  id SERIAL PRIMARY KEY,
  task_number VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  variant VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'created',
  contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
  subsystem_id INTEGER REFERENCES subsystems(id) ON DELETE SET NULL,
  brigade_id INTEGER REFERENCES brigades(id) ON DELETE SET NULL,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date TIMESTAMP,
  actual_end_date TIMESTAMP,
  priority INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Create service_task_activities table
CREATE TABLE IF NOT EXISTS service_task_activities (
  id SERIAL PRIMARY KEY,
  service_task_id INTEGER NOT NULL REFERENCES service_tasks(id) ON DELETE CASCADE,
  performed_by INTEGER NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  performed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_tasks_task_number ON service_tasks(task_number);
CREATE INDEX IF NOT EXISTS idx_service_tasks_contract ON service_tasks(contract_id);
CREATE INDEX IF NOT EXISTS idx_service_tasks_subsystem ON service_tasks(subsystem_id);
CREATE INDEX IF NOT EXISTS idx_service_tasks_brigade ON service_tasks(brigade_id);
CREATE INDEX IF NOT EXISTS idx_service_tasks_status ON service_tasks(status);
CREATE INDEX IF NOT EXISTS idx_service_tasks_variant ON service_tasks(variant);
CREATE INDEX IF NOT EXISTS idx_service_tasks_created_by ON service_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_service_tasks_dates ON service_tasks(planned_start_date, planned_end_date);

CREATE INDEX IF NOT EXISTS idx_service_task_activities_task ON service_task_activities(service_task_id);
CREATE INDEX IF NOT EXISTS idx_service_task_activities_performer ON service_task_activities(performed_by);
CREATE INDEX IF NOT EXISTS idx_service_task_activities_type ON service_task_activities(activity_type);

-- Add comments
COMMENT ON TABLE service_tasks IS 'Zadania serwisowe (reklamacje, gwarancja, itp.)';
COMMENT ON COLUMN service_tasks.task_number IS 'Numer zadania w formacie SRV-XXXXXX';
COMMENT ON COLUMN service_tasks.variant IS 'Typ zadania: REKLAMACJA, GWARANCYJNY, POGWARANCYJNY, BEZGWARANCYJNY';
COMMENT ON COLUMN service_tasks.priority IS 'Priorytet zadania (0-10, 10 najwyższy)';
COMMENT ON TABLE service_task_activities IS 'Historia czynności wykonanych na zadaniach serwisowych';
COMMENT ON COLUMN service_task_activities.activity_type IS 'Typ czynności: status_change, note, photo, material_used';
