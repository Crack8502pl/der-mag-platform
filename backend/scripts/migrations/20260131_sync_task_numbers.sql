-- Migration: Synchronize task numbers and update contractNumber
-- Date: 2026-01-31
-- Description: 
--   1. Updates contractNumber in tasks table for existing tasks
--   2. Updates comment on subsystem_tasks.task_number column
--   3. Logs migration in audit_logs

-- ============================================
-- 1. UPDATE contractNumber IN EXISTING TASKS
-- ============================================
-- Fill in contractNumber for tasks that have contractId but missing contractNumber

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE tasks t
  SET contract_number = c.contract_number
  FROM contracts c
  WHERE t.contract_id = c.id
    AND t.contract_id IS NOT NULL
    AND (t.contract_number IS NULL OR t.contract_number = '');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated contractNumber for % tasks', updated_count;
END $$;

-- ============================================
-- 2. UPDATE COLUMN COMMENT
-- ============================================
-- Change comment from old format (P000010726-001) to new format (ZXXXXMMRR)

COMMENT ON COLUMN subsystem_tasks.task_number IS 'Unikalny numer zadania w formacie ZXXXXMMRR (zunifikowany z tabeli tasks)';

-- ============================================
-- 3. LOG MIGRATION IN AUDIT_LOGS
-- ============================================
-- Insert migration record (if audit_logs table exists)

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (event_type, details, created_at)
    VALUES (
      'MIGRATION',
      jsonb_build_object(
        'migration', '20260131_sync_task_numbers',
        'description', 'Synchronized contractNumber in tasks table, updated task_number format comment',
        'executed_at', NOW()
      ),
      NOW()
    );
  END IF;
END $$;

-- ============================================
-- 4. VERIFICATION QUERIES (for manual check)
-- ============================================
-- Run these queries manually to verify migration success:

-- Check tasks with contractId but missing contractNumber (should be 0 after migration)
-- SELECT COUNT(*) FROM tasks WHERE contract_id IS NOT NULL AND (contract_number IS NULL OR contract_number = '');

-- Check subsystem_tasks with new format ZXXXXMMRR
-- SELECT task_number FROM subsystem_tasks WHERE task_number LIKE 'Z%' LIMIT 10;

-- Check subsystem_tasks with old format (historical data)
-- SELECT task_number FROM subsystem_tasks WHERE task_number LIKE 'P%' LIMIT 10;

-- ============================================
-- NOTE ON HISTORICAL DATA
-- ============================================
-- Existing SubsystemTask records with old format (P000010726-001) are NOT modified.
-- Only NEW tasks created after this migration will use ZXXXXMMRR format.
-- This preserves data integrity for historical records.
--
-- If you need to migrate old SubsystemTask numbers to new format:
-- 1. Create backup of subsystem_tasks table
-- 2. Generate new ZXXXXMMRR numbers for each old task
-- 3. Update both subsystem_tasks.task_number AND tasks.task_number
-- 4. This is a complex operation - contact dev team before proceeding
