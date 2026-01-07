-- Migration: Add subsystem_tasks table for workflow tracking
-- Date: 2026-01-07
-- Description: Creates subsystem_tasks table with full workflow status tracking

CREATE TABLE IF NOT EXISTS subsystem_tasks (
  id SERIAL PRIMARY KEY,
  subsystem_id INTEGER NOT NULL REFERENCES subsystems(id) ON DELETE CASCADE,
  task_number VARCHAR(20) NOT NULL UNIQUE,
  task_name VARCHAR(255) NOT NULL,
  task_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'CREATED',
  
  -- BOM tracking
  bom_generated BOOLEAN DEFAULT FALSE,
  bom_id INTEGER REFERENCES workflow_generated_boms(id) ON DELETE SET NULL,
  
  -- Completion tracking
  completion_order_id INTEGER REFERENCES completion_orders(id) ON DELETE SET NULL,
  completion_started_at TIMESTAMP,
  completion_completed_at TIMESTAMP,
  
  -- Prefabrication tracking
  prefabrication_task_id INTEGER REFERENCES prefabrication_tasks(id) ON DELETE SET NULL,
  prefabrication_started_at TIMESTAMP,
  prefabrication_completed_at TIMESTAMP,
  
  -- Deployment tracking
  deployment_scheduled_at TIMESTAMP,
  deployment_completed_at TIMESTAMP,
  
  -- Verification
  verification_completed_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indeksy
CREATE INDEX idx_subsystem_tasks_subsystem_id ON subsystem_tasks(subsystem_id);
CREATE INDEX idx_subsystem_tasks_status ON subsystem_tasks(status);
CREATE UNIQUE INDEX idx_subsystem_tasks_task_number ON subsystem_tasks(task_number);
CREATE INDEX idx_subsystem_tasks_completion_order ON subsystem_tasks(completion_order_id);
CREATE INDEX idx_subsystem_tasks_prefab_task ON subsystem_tasks(prefabrication_task_id);
CREATE INDEX idx_subsystem_tasks_bom ON subsystem_tasks(bom_id);

-- Constraint na status
ALTER TABLE subsystem_tasks 
  ADD CONSTRAINT check_task_status 
  CHECK (status IN (
    'CREATED', 
    'BOM_GENERATED', 
    'COMPLETION_ASSIGNED', 
    'COMPLETION_IN_PROGRESS',
    'COMPLETION_COMPLETED',
    'PREFABRICATION_ASSIGNED',
    'PREFABRICATION_IN_PROGRESS',
    'PREFABRICATION_COMPLETED',
    'READY_FOR_DEPLOYMENT',
    'DEPLOYED',
    'VERIFIED',
    'CANCELLED'
  ));

-- Trigger dla updated_at
CREATE OR REPLACE FUNCTION update_subsystem_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subsystem_tasks_updated_at
  BEFORE UPDATE ON subsystem_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_subsystem_tasks_updated_at();

-- Dodaj komentarze do tabeli
COMMENT ON TABLE subsystem_tasks IS 'Zadania podsystemów z pełnym trackingiem workflow';
COMMENT ON COLUMN subsystem_tasks.task_number IS 'Unikalny numer zadania w formacie {SubsystemNumber}-{Seq}, np. P000010726-001';
COMMENT ON COLUMN subsystem_tasks.status IS 'Status zadania w workflow: CREATED -> BOM_GENERATED -> COMPLETION_ASSIGNED -> ... -> VERIFIED';
