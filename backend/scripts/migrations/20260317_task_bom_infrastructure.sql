-- Migration: Task BOM Infrastructure
-- Date: 2026-03-17
-- Description: Add tables and columns for per-task BOM (task-level BOM instead of subsystem-level)
-- This is Phase 1 - infrastructure only, no data migration

-- 1. Create task_generated_boms table (per-task BOM)
CREATE TABLE IF NOT EXISTS task_generated_boms (
    id SERIAL PRIMARY KEY,
    
    -- Link to task (via task_number for cross-table compatibility)
    task_number VARCHAR(20) NOT NULL,
    
    -- Link to subsystem (for aggregation)
    subsystem_id INTEGER REFERENCES subsystems(id) ON DELETE CASCADE,
    
    -- Template used
    template_id INTEGER REFERENCES bom_subsystem_templates(id),
    
    -- Status
    status VARCHAR(30) DEFAULT 'GENERATED',
    
    -- Config params used during generation
    config_params JSONB DEFAULT '{}',
    
    -- Metadata
    generated_by INTEGER REFERENCES users(id),
    generated_at TIMESTAMP DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_task_bom UNIQUE(task_number)
);

-- 2. Create task_generated_bom_items table
CREATE TABLE IF NOT EXISTS task_generated_bom_items (
    id SERIAL PRIMARY KEY,
    
    -- Link to task BOM
    task_bom_id INTEGER NOT NULL REFERENCES task_generated_boms(id) ON DELETE CASCADE,
    
    -- Link to template item
    template_item_id INTEGER REFERENCES bom_subsystem_template_items(id),
    
    -- Material info (copied from template for immutability)
    item_name VARCHAR(255) NOT NULL,
    catalog_number VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'szt',
    
    -- IP tracking
    requires_ip BOOLEAN DEFAULT FALSE,
    assigned_ip VARCHAR(45),  -- IPv4 or IPv6
    
    -- Scanning/completion tracking
    scanned_quantity INTEGER DEFAULT 0,
    
    -- Group and sort
    group_name VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    
    -- Device category for IP pool allocation
    device_category VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Add task_bom_id column to tasks table (nullable for backward compatibility)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS task_bom_id INTEGER REFERENCES task_generated_boms(id) ON DELETE SET NULL;

-- 4. Add task_bom_id column to subsystem_tasks table
ALTER TABLE subsystem_tasks 
ADD COLUMN IF NOT EXISTS task_bom_id INTEGER REFERENCES task_generated_boms(id) ON DELETE SET NULL;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_bom_task_number ON task_generated_boms(task_number);
CREATE INDEX IF NOT EXISTS idx_task_bom_subsystem ON task_generated_boms(subsystem_id);
CREATE INDEX IF NOT EXISTS idx_task_bom_items_bom ON task_generated_bom_items(task_bom_id);
CREATE INDEX IF NOT EXISTS idx_task_bom_items_ip ON task_generated_bom_items(requires_ip) WHERE requires_ip = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_task_bom ON tasks(task_bom_id) WHERE task_bom_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subsystem_tasks_task_bom ON subsystem_tasks(task_bom_id) WHERE task_bom_id IS NOT NULL;

-- 6. Create view for subsystem BOM aggregation (sum of all task BOMs)
CREATE OR REPLACE VIEW subsystem_aggregated_bom AS
SELECT 
    tgb.subsystem_id,
    tgbi.item_name,
    tgbi.catalog_number,
    tgbi.unit,
    tgbi.device_category,
    tgbi.requires_ip,
    SUM(tgbi.quantity) as total_quantity,
    SUM(tgbi.scanned_quantity) as total_scanned,
    COUNT(DISTINCT tgb.task_number) as task_count,
    ARRAY_AGG(DISTINCT tgb.task_number) as task_numbers
FROM task_generated_boms tgb
JOIN task_generated_bom_items tgbi ON tgbi.task_bom_id = tgb.id
WHERE tgb.subsystem_id IS NOT NULL
GROUP BY 
    tgb.subsystem_id,
    tgbi.item_name,
    tgbi.catalog_number,
    tgbi.unit,
    tgbi.device_category,
    tgbi.requires_ip
ORDER BY tgb.subsystem_id, tgbi.item_name;

-- 7. Create view for subsystem IP requirements (for IP pool allocation)
CREATE OR REPLACE VIEW subsystem_ip_requirements AS
SELECT 
    tgb.subsystem_id,
    s.subsystem_number,
    tgbi.device_category,
    COUNT(*) as device_count,
    SUM(tgbi.quantity) as total_quantity,
    SUM(CASE WHEN tgbi.assigned_ip IS NOT NULL THEN 1 ELSE 0 END) as assigned_count
FROM task_generated_boms tgb
JOIN task_generated_bom_items tgbi ON tgbi.task_bom_id = tgb.id
JOIN subsystems s ON s.id = tgb.subsystem_id
WHERE tgbi.requires_ip = TRUE
GROUP BY tgb.subsystem_id, s.subsystem_number, tgbi.device_category
ORDER BY tgb.subsystem_id, tgbi.device_category;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Migration completed: Task BOM infrastructure created';
    RAISE NOTICE 'Tables created: task_generated_boms, task_generated_bom_items';
    RAISE NOTICE 'Columns added: tasks.task_bom_id, subsystem_tasks.task_bom_id';
    RAISE NOTICE 'Views created: subsystem_aggregated_bom, subsystem_ip_requirements';
END $$;
