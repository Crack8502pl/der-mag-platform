-- ============================================================================
-- Migration: Create Asset Management Tables
-- Date: 2026-04-12
-- Description: Creates the database foundation for the Asset Management System.
--              Tracks physical infrastructure assets (crossings, LCS, CUID,
--              control rooms) throughout their lifecycle.
-- Backwards Compatible: YES - all new columns are nullable with safe defaults
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ASSETS TABLE
-- ----------------------------------------------------------------------------
-- Stores all physical infrastructure assets (crossings, LCS, CUID, etc.)
CREATE TABLE IF NOT EXISTS assets (
  -- Primary identification
  id                        SERIAL PRIMARY KEY,
  asset_number              VARCHAR(20)  UNIQUE NOT NULL, -- Format: OBJ-XXXXXXMMRR

  -- Asset classification
  asset_type                VARCHAR(50)  NOT NULL,        -- PRZEJAZD, LCS, CUID, NASTAWNIA, SKP
  name                      VARCHAR(255) NOT NULL,        -- Human-readable name
  category                  VARCHAR(10),                  -- For crossings: KAT A/B/C/E/F

  -- Location data
  linia_kolejowa            VARCHAR(20),                  -- Railway line (e.g. LK-123, E-20)
  kilometraz                VARCHAR(20),                  -- Kilometer marker (e.g. 45,678)
  gps_latitude              DECIMAL(10, 8),               -- GPS latitude
  gps_longitude             DECIMAL(11, 8),               -- GPS longitude
  google_maps_url           TEXT,                         -- Full Google Maps link
  miejscowosc               VARCHAR(255),                 -- City / town

  -- Relations
  contract_id               INTEGER REFERENCES contracts(id)       ON DELETE SET NULL,
  subsystem_id              INTEGER REFERENCES subsystems(id)      ON DELETE SET NULL,
  installation_task_id      INTEGER REFERENCES subsystem_tasks(id) ON DELETE SET NULL,

  -- Lifecycle status
  status                    VARCHAR(50) NOT NULL DEFAULT 'planned',

  -- Lifecycle dates
  planned_installation_date DATE,
  actual_installation_date  DATE,
  warranty_expiry_date      DATE,
  last_service_date         DATE,
  next_service_due_date     DATE,
  decommission_date         DATE,

  -- Bill of Materials snapshot (JSON)
  bom_snapshot              JSONB,

  -- Additional metadata
  notes                     TEXT,
  photos_folder             VARCHAR(255),

  -- Audit fields
  created_at                TIMESTAMP DEFAULT NOW(),
  updated_at                TIMESTAMP DEFAULT NOW(),
  created_by                INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT chk_asset_type CHECK (asset_type IN (
    'PRZEJAZD', 'SKP', 'NASTAWNIA', 'LCS', 'CUID'
  )),
  CONSTRAINT chk_asset_status CHECK (status IN (
    'planned', 'installed', 'active', 'in_service',
    'faulty', 'inactive', 'decommissioned'
  )),
  CONSTRAINT chk_asset_category CHECK (
    category IS NULL OR category IN ('KAT A', 'KAT B', 'KAT C', 'KAT E', 'KAT F')
  )
);

-- Indexes for assets
-- Note: asset_number already has an implicit index via its UNIQUE constraint.
CREATE INDEX IF NOT EXISTS idx_assets_type             ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status           ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_contract         ON assets(contract_id);
CREATE INDEX IF NOT EXISTS idx_assets_subsystem        ON assets(subsystem_id);
CREATE INDEX IF NOT EXISTS idx_assets_installation_task ON assets(installation_task_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at       ON assets(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. ASSET_TASKS TABLE  (Many-to-Many: assets ↔ subsystem_tasks)
-- ----------------------------------------------------------------------------
-- Links assets to tasks with a role that describes the task's purpose.
CREATE TABLE IF NOT EXISTS asset_tasks (
  id         SERIAL PRIMARY KEY,
  asset_id   INTEGER NOT NULL REFERENCES assets(id)         ON DELETE CASCADE,
  task_id    INTEGER NOT NULL REFERENCES subsystem_tasks(id) ON DELETE CASCADE,
  task_role  VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Prevent duplicate asset-task associations
  UNIQUE(asset_id, task_id),

  CONSTRAINT chk_asset_task_role CHECK (task_role IN (
    'installation', 'warranty_service', 'repair', 'maintenance', 'decommission'
  ))
);

CREATE INDEX IF NOT EXISTS idx_asset_tasks_asset ON asset_tasks(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tasks_task  ON asset_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_asset_tasks_role  ON asset_tasks(task_role);

-- ----------------------------------------------------------------------------
-- 3. ASSET_STATUS_HISTORY TABLE
-- ----------------------------------------------------------------------------
-- Audit trail that records every status transition for an asset.
CREATE TABLE IF NOT EXISTS asset_status_history (
  id          SERIAL PRIMARY KEY,
  asset_id    INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  old_status  VARCHAR(50),
  new_status  VARCHAR(50) NOT NULL,
  changed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_at  TIMESTAMP DEFAULT NOW(),
  reason      TEXT,

  CONSTRAINT chk_history_status CHECK (
    (old_status IS NULL OR old_status IN (
      'planned', 'installed', 'active', 'in_service',
      'faulty', 'inactive', 'decommissioned'
    )) AND
    new_status IN (
      'planned', 'installed', 'active', 'in_service',
      'faulty', 'inactive', 'decommissioned'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_asset_status_history_asset      ON asset_status_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_status_history_changed_at ON asset_status_history(changed_at DESC);

-- ----------------------------------------------------------------------------
-- 4. EXTEND EXISTING TABLES  (backwards-compatible – all new columns nullable)
-- ----------------------------------------------------------------------------

-- 4a. devices: link device to the asset it is installed in
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS installed_asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status             VARCHAR(50) DEFAULT 'in_stock';

ALTER TABLE devices
  ADD CONSTRAINT chk_device_status CHECK (status IN (
    'in_stock', 'reserved', 'installed', 'faulty', 'returned', 'decommissioned'
  ));

CREATE INDEX IF NOT EXISTS idx_devices_installed_asset ON devices(installed_asset_id);
CREATE INDEX IF NOT EXISTS idx_devices_status          ON devices(status);

-- 4b. subsystem_tasks: link task to an asset and describe its role
ALTER TABLE subsystem_tasks
  ADD COLUMN IF NOT EXISTS linked_asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_role       VARCHAR(50);

ALTER TABLE subsystem_tasks
  ADD CONSTRAINT chk_subsystem_task_role CHECK (
    task_role IS NULL OR task_role IN (
      'installation', 'warranty_service', 'repair', 'maintenance', 'decommission'
    )
  );

CREATE INDEX IF NOT EXISTS idx_subsystem_tasks_linked_asset ON subsystem_tasks(linked_asset_id);

-- ----------------------------------------------------------------------------
-- 5. TRIGGER: auto-update assets.updated_at on every UPDATE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_asset_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS asset_updated_at ON assets;
CREATE TRIGGER asset_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_timestamp();

-- ----------------------------------------------------------------------------
-- 6. TRIGGER: auto-log status changes into asset_status_history
-- ----------------------------------------------------------------------------
-- Note: changed_by is populated from NEW.created_by (the asset owner/creator).
-- A future migration will add an updated_by column so that the actual updater
-- can be tracked. For now the trigger follows the spec from PR #1.
CREATE OR REPLACE FUNCTION log_asset_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO asset_status_history (asset_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS asset_status_change ON assets;
CREATE TRIGGER asset_status_change
  AFTER UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION log_asset_status_change();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
