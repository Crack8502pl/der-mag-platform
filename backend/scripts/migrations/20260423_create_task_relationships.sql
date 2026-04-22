-- backend/scripts/migrations/20260423_create_task_relationships.sql
-- Creates the task_relationships table for hierarchical task management

CREATE TABLE IF NOT EXISTS task_relationships (
    id           SERIAL PRIMARY KEY,
    subsystem_id INTEGER NOT NULL REFERENCES subsystems(id) ON DELETE CASCADE,
    parent_task_id INTEGER NOT NULL REFERENCES subsystem_tasks(id) ON DELETE CASCADE,
    child_task_id  INTEGER NOT NULL REFERENCES subsystem_tasks(id) ON DELETE CASCADE,
    parent_type  VARCHAR(50) NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (parent_task_id, child_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_relationships_subsystem  ON task_relationships(subsystem_id);
CREATE INDEX IF NOT EXISTS idx_task_relationships_parent     ON task_relationships(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_relationships_child      ON task_relationships(child_task_id);

COMMENT ON TABLE task_relationships IS
  'Stores hierarchical parent-child relationships between subsystem tasks (e.g. LCS → Nastawnia/SKP/Przejazd)';
COMMENT ON COLUMN task_relationships.parent_type IS
  'Type of the parent task: LCS or NASTAWNIA';
