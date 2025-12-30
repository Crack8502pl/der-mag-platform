-- Migration: Add bom_triggers and bom_trigger_logs tables
-- Created: 2025-12-30
-- Description: Implements BOM trigger system for automated actions

-- Create bom_triggers table
CREATE TABLE IF NOT EXISTS bom_triggers (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(50) NOT NULL,
    trigger_condition JSONB DEFAULT '{}'::jsonb,
    action_type VARCHAR(50) NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_task_type_id INTEGER,
    target_task_type_id INTEGER,
    priority INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bom_triggers_source_task_type FOREIGN KEY (source_task_type_id) REFERENCES task_types(id) ON DELETE SET NULL,
    CONSTRAINT fk_bom_triggers_target_task_type FOREIGN KEY (target_task_type_id) REFERENCES task_types(id) ON DELETE SET NULL,
    CONSTRAINT fk_bom_triggers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_trigger_event CHECK (trigger_event IN ('ON_TASK_CREATE', 'ON_STATUS_CHANGE', 'ON_BOM_UPDATE', 'ON_MATERIAL_ADD', 'ON_QUANTITY_CHANGE')),
    CONSTRAINT chk_action_type CHECK (action_type IN ('ADD_MATERIAL', 'UPDATE_QUANTITY', 'COPY_BOM', 'NOTIFY', 'CALCULATE_COST'))
);

-- Create indexes for bom_triggers
CREATE INDEX IF NOT EXISTS idx_bom_triggers_trigger_event ON bom_triggers(trigger_event);
CREATE INDEX IF NOT EXISTS idx_bom_triggers_is_active ON bom_triggers(is_active);
CREATE INDEX IF NOT EXISTS idx_bom_triggers_priority ON bom_triggers(priority DESC);
CREATE INDEX IF NOT EXISTS idx_bom_triggers_source_task_type ON bom_triggers(source_task_type_id);
CREATE INDEX IF NOT EXISTS idx_bom_triggers_target_task_type ON bom_triggers(target_task_type_id);

-- Create bom_trigger_logs table
CREATE TABLE IF NOT EXISTS bom_trigger_logs (
    id SERIAL PRIMARY KEY,
    trigger_id INTEGER NOT NULL,
    task_id INTEGER,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    input_data JSONB DEFAULT '{}'::jsonb,
    result_data JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    CONSTRAINT fk_bom_trigger_logs_trigger FOREIGN KEY (trigger_id) REFERENCES bom_triggers(id) ON DELETE CASCADE,
    CONSTRAINT fk_bom_trigger_logs_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- Create indexes for bom_trigger_logs
CREATE INDEX IF NOT EXISTS idx_bom_trigger_logs_trigger_id ON bom_trigger_logs(trigger_id);
CREATE INDEX IF NOT EXISTS idx_bom_trigger_logs_task_id ON bom_trigger_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_bom_trigger_logs_executed_at ON bom_trigger_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bom_trigger_logs_success ON bom_trigger_logs(success);

-- Comments
COMMENT ON TABLE bom_triggers IS 'Automatyczne triggery/akcje dla BOM';
COMMENT ON TABLE bom_trigger_logs IS 'Logi wykonania triggerów BOM';

COMMENT ON COLUMN bom_triggers.trigger_event IS 'Typ eventu wywołującego trigger';
COMMENT ON COLUMN bom_triggers.trigger_condition IS 'Warunki wykonania triggera (JSONB)';
COMMENT ON COLUMN bom_triggers.action_type IS 'Typ akcji do wykonania';
COMMENT ON COLUMN bom_triggers.action_config IS 'Konfiguracja akcji (JSONB)';
COMMENT ON COLUMN bom_triggers.priority IS 'Priorytet wykonania (większy = wcześniej)';

-- Seed data - przykładowe triggery
INSERT INTO bom_triggers (name, description, trigger_event, trigger_condition, action_type, action_config, created_by, priority)
VALUES 
(
    'Auto-dodaj kabel UTP do zadań LAN',
    'Automatycznie dodaje kabel UTP Cat6 przy tworzeniu zadań typu LAN',
    'ON_TASK_CREATE',
    '{"taskTypeCode": "LAN"}'::jsonb,
    'ADD_MATERIAL',
    '{"materialName": "Kabel UTP Cat6", "defaultQuantity": 100, "unit": "m", "category": "network"}'::jsonb,
    1,
    10
),
(
    'Powiadomienie przy zmianie statusu na zakończone',
    'Wysyła powiadomienie gdy zadanie zostaje zakończone',
    'ON_STATUS_CHANGE',
    '{"status": "completed"}'::jsonb,
    'NOTIFY',
    '{"message": "Zadanie zostało zakończone", "recipients": ["manager", "coordinator"]}'::jsonb,
    1,
    5
),
(
    'Przelicz koszty po dodaniu materiału',
    'Automatycznie przelicza całkowity koszt materiałów po dodaniu nowego',
    'ON_MATERIAL_ADD',
    '{}'::jsonb,
    'CALCULATE_COST',
    '{}'::jsonb,
    1,
    8
)
ON CONFLICT DO NOTHING;

-- Function to cleanup old trigger logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_trigger_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM bom_trigger_logs
    WHERE executed_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_trigger_logs IS 'Usuwa stare logi triggerów starsze niż retention_days (domyślnie 90 dni)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: bom_triggers and bom_trigger_logs tables created successfully';
END $$;
