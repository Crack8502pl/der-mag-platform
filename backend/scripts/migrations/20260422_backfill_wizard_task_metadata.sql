-- backend/scripts/migrations/20260422_backfill_wizard_task_metadata.sql
--
-- Migration: Backfill metadata from taskName for wizard-created tasks
-- Date: 2026-04-22
-- Description: Extracts data from task_name using regex and populates metadata JSONB
--              for tasks where metadata is empty or incomplete.
--
-- Scope: subsystem_tasks where metadata->>'createdFromWizard' = 'true'
--        and task_type IN ('PRZEJAZD_KAT_A', 'PRZEJAZD_KAT_B', 'SKP', 'NASTAWNIA', 'LCS', 'CUID')
--
-- Idempotent: YES - only updates tasks with missing metadata fields (uses COALESCE to preserve existing values)
-- Rollback:   NOT provided - this is an additive operation; data may have been edited by users after migration
--
-- NOTE: Regex patterns below use single backslashes (e.g. \d) which is correct for standard
--       PostgreSQL string literals (standard_conforming_strings = on, the default since pg 9.1).
--       In that mode a backslash in a single-quoted string is a literal backslash character,
--       and the PostgreSQL regex engine treats \d as the digit character class [0-9].

BEGIN;

-- Log start
DO $$
BEGIN
  RAISE NOTICE '🚀 Starting metadata backfill migration for wizard tasks...';
END $$;

-- Main update query
WITH task_data AS (
  SELECT
    id,
    task_name,
    task_type,
    metadata,
    -- Extract liniaKolejowa (LK-XXX or E-XX)
    (regexp_match(task_name, '(LK-\d{1,3}|E-\d{1,2})'))[1]       AS extracted_linia,
    -- Extract kilometraz (XXX,XXX)
    (regexp_match(task_name, '(\d{2,3},\d{3})'))[1]               AS extracted_km,
    -- Extract kategoria (KAT X)
    (regexp_match(task_name, '(KAT [A-EF])'))[1]                  AS extracted_kat,
    -- Extract nazwa (after ND/LCS/CUID - , up to next | or -)
    (regexp_match(task_name, '(ND|LCS|CUID) - ([^|\-]+)'))[2]     AS extracted_nazwa,
    -- Extract miejscowosc (last segment after last -)
    (regexp_match(task_name, ' - ([^|]+)$'))[1]                   AS extracted_miejsc
  FROM subsystem_tasks
  WHERE
    -- Only wizard-created tasks
    metadata->>'createdFromWizard' = 'true'
    -- Only tasks with empty/incomplete metadata
    AND (
      (metadata->>'kilometraz')    IS NULL
      OR (metadata->>'kategoria')  IS NULL
      OR (metadata->>'liniaKolejowa') IS NULL
      OR (metadata->>'nazwa')      IS NULL
      OR (metadata->>'miejscowosc') IS NULL
    )
    -- Only wizard task types that encode data in taskName
    AND task_type IN (
      'PRZEJAZD_KAT_A', 'PRZEJAZD_KAT_B', 'SKP',
      'NASTAWNIA', 'LCS', 'CUID'
    )
),
updated_tasks AS (
  UPDATE subsystem_tasks st
  SET
    metadata = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              st.metadata,
              '{liniaKolejowa}',
              to_jsonb(COALESCE(td.extracted_linia, st.metadata->>'liniaKolejowa', '')),
              true
            ),
            '{kilometraz}',
            to_jsonb(COALESCE(td.extracted_km, st.metadata->>'kilometraz', '')),
            true
          ),
          '{kategoria}',
          to_jsonb(COALESCE(td.extracted_kat, st.metadata->>'kategoria', '')),
          true
        ),
        '{nazwa}',
        to_jsonb(COALESCE(td.extracted_nazwa, st.metadata->>'nazwa', '')),
        true
      ),
      '{miejscowosc}',
      to_jsonb(COALESCE(td.extracted_miejsc, st.metadata->>'miejscowosc', '')),
      true
    ),
    updated_at = CURRENT_TIMESTAMP
  FROM task_data td
  WHERE st.id = td.id
    AND (
      td.extracted_linia  IS NOT NULL
      OR td.extracted_km  IS NOT NULL
      OR td.extracted_kat IS NOT NULL
      OR td.extracted_nazwa IS NOT NULL
      OR td.extracted_miejsc IS NOT NULL
    )
  RETURNING st.id, st.task_name, st.task_type
)
SELECT
  COUNT(*) AS updated_count
FROM updated_tasks;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Metadata backfill completed for wizard tasks';
END $$;

COMMIT;
