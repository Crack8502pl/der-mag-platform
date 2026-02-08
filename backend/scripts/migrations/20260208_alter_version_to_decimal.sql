-- Migration: Change version column to decimal for fractional versioning
-- Date: 2026-02-08
-- Description: Changes the version column in bom_subsystem_templates from INTEGER to DECIMAL(5,2)
-- to support fractional version increments for template updates

ALTER TABLE bom_subsystem_templates 
ALTER COLUMN version TYPE DECIMAL(5,2) 
USING version::DECIMAL(5,2);
