-- Migration: Diagnose legacy wizard data
-- Date: 2026-03-17
-- Description: Find contracts that might have been created with legacy wizard format

-- Diagnostic query: Find contracts without proper subsystem tasks
SELECT 
    c.id as contract_id,
    c.contract_number,
    c.custom_name,
    c.created_at,
    COUNT(DISTINCT s.id) as subsystem_count,
    COUNT(DISTINCT st.id) as subsystem_task_count,
    COUNT(DISTINCT t.id) as task_count,
    CASE 
        WHEN COUNT(DISTINCT st.id) = 0 AND COUNT(DISTINCT s.id) > 0 THEN 'LEGACY_NO_SUBSYSTEM_TASKS'
        WHEN COUNT(DISTINCT t.id) = 0 AND COUNT(DISTINCT s.id) > 0 THEN 'LEGACY_NO_MAIN_TASKS'
        WHEN COUNT(DISTINCT st.id) != COUNT(DISTINCT t.id) THEN 'MISMATCH_TASK_COUNT'
        ELSE 'OK'
    END as diagnostic_status
FROM contracts c
LEFT JOIN subsystems s ON s.contract_id = c.id
LEFT JOIN subsystem_tasks st ON st.subsystem_id = s.id
LEFT JOIN tasks t ON t.subsystem_id = s.id AND t.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.contract_number, c.custom_name, c.created_at
HAVING 
    COUNT(DISTINCT st.id) = 0 
    OR COUNT(DISTINCT t.id) = 0 
    OR COUNT(DISTINCT st.id) != COUNT(DISTINCT t.id)
ORDER BY c.created_at DESC;

-- Summary statistics
SELECT 
    'Total contracts' as metric,
    COUNT(*) as value
FROM contracts WHERE deleted_at IS NULL
UNION ALL
SELECT 
    'Contracts with subsystems',
    COUNT(DISTINCT c.id)
FROM contracts c
JOIN subsystems s ON s.contract_id = c.id
WHERE c.deleted_at IS NULL
UNION ALL
SELECT 
    'Contracts with subsystem_tasks',
    COUNT(DISTINCT c.id)
FROM contracts c
JOIN subsystems s ON s.contract_id = c.id
JOIN subsystem_tasks st ON st.subsystem_id = s.id
WHERE c.deleted_at IS NULL
UNION ALL
SELECT 
    'Contracts with main tasks',
    COUNT(DISTINCT c.id)
FROM contracts c
JOIN tasks t ON t.contract_id = c.id AND t.deleted_at IS NULL
WHERE c.deleted_at IS NULL;

-- NOTE: This is a diagnostic script only, no data modifications
-- Review the output and manually fix any LEGACY_ or MISMATCH_ entries
