-- Migration: Add ip_pool column to subsystems table
-- Date: 2026-01-08
-- Description: Add IP pool field to subsystems for validating unique IP pools per contract

-- Add ip_pool column to subsystems table
ALTER TABLE subsystems 
ADD COLUMN IF NOT EXISTS ip_pool VARCHAR(50);

-- Add index for faster searching of IP pools
CREATE INDEX IF NOT EXISTS idx_subsystems_ip_pool ON subsystems(ip_pool) WHERE ip_pool IS NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN subsystems.ip_pool IS 'IP address pool in CIDR format (e.g., 192.168.1.0/24). Must be unique per contract.';
