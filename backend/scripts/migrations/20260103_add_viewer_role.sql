-- Migration: Add viewer role with read-only permissions
-- Date: 2026-01-03
-- Description: Adds a new 'viewer' role with read-only access to all modules

-- Add viewer role with comprehensive read-only permissions
INSERT INTO roles (name, description, permissions, created_at, updated_at)
VALUES (
  'viewer',
  'Podgląd - tylko odczyt wszystkich modułów',
  '{
    "dashboard": { "read": true },
    "contracts": { "read": true },
    "subsystems": { "read": true },
    "tasks": { "read": true },
    "completion": { "read": true },
    "prefabrication": { "read": true },
    "network": { "read": true, "viewMatrix": true },
    "bom": { "read": true },
    "devices": { "read": true },
    "users": { "read": true },
    "reports": { "read": true },
    "settings": { "read": true },
    "photos": { "read": true },
    "documents": { "read": true },
    "notifications": { "receiveAlerts": true }
  }'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = CURRENT_TIMESTAMP;
