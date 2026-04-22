// src/migrations/1714080000000-BackfillWizardTaskMetadata.ts
// TypeORM migration to backfill metadata for wizard-created tasks
// that only have data encoded in taskName (pre-Issue #372 tasks)

import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillWizardTaskMetadata1714080000000 implements MigrationInterface {
  name = 'BackfillWizardTaskMetadata1714080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const updates = `
      WITH task_data AS (
        SELECT
          id,
          task_name,
          task_type,
          metadata,
          -- Extract liniaKolejowa (LK-XXX or E-XX)
          (regexp_match(task_name, '(LK-\\d{1,3}|E-\\d{1,2})'))[1] AS extracted_linia,
          -- Extract kilometraz (XXX,XXX)
          (regexp_match(task_name, '(\\d{2,3},\\d{3})'))[1] AS extracted_km,
          -- Extract kategoria (KAT X)
          (regexp_match(task_name, '(KAT [A-EF])'))[1] AS extracted_kat,
          -- Extract nazwa (after ND/LCS/CUID -)
          (regexp_match(task_name, '(ND|LCS|CUID) - ([^|\\-]+)'))[2] AS extracted_nazwa,
          -- Extract miejscowosc (last segment after -)
          (regexp_match(task_name, ' - ([^|]+)$'))[1] AS extracted_miejsc
        FROM subsystem_tasks
        WHERE
          -- Only wizard-created tasks
          metadata->>'createdFromWizard' = 'true'
          -- Only tasks with empty/incomplete metadata
          AND (
            (metadata->>'kilometraz') IS NULL
            OR (metadata->>'kategoria') IS NULL
            OR (metadata->>'liniaKolejowa') IS NULL
            OR (metadata->>'nazwa') IS NULL
            OR (metadata->>'miejscowosc') IS NULL
          )
          -- Only specific task types
          AND task_type IN (
            'PRZEJAZD_KAT_A', 'PRZEJAZD_KAT_B', 'SKP',
            'NASTAWNIA', 'LCS', 'CUID'
          )
      )
      UPDATE subsystem_tasks st
      SET metadata = jsonb_set(
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
          td.extracted_linia IS NOT NULL
          OR td.extracted_km IS NOT NULL
          OR td.extracted_kat IS NOT NULL
          OR td.extracted_nazwa IS NOT NULL
          OR td.extracted_miejsc IS NOT NULL
        );
    `;

    const result = await queryRunner.query(updates);
    const updatedCount = Array.isArray(result) ? result.length : (result?.rowCount ?? 0);
    console.log(`✅ Metadata backfill completed for wizard tasks. Updated: ${updatedCount} rows`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️  Rollback not implemented - metadata backfill is additive');
    // Rollback nie usuwa danych, bo mogły być już edytowane przez użytkowników
  }
}
