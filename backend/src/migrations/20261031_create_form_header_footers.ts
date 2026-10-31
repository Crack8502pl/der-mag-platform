import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFormHeaderFooters1793454000000 implements MigrationInterface {
  name = 'CreateFormHeaderFooters1793454000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE form_header_footers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        kind VARCHAR(10) NOT NULL,
        mode VARCHAR(10) NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        height_mm NUMERIC(5, 2) NOT NULL DEFAULT 20,
        file_path TEXT,
        file_mime VARCHAR(100),
        layout JSONB,
        created_by_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP,
        CONSTRAINT chk_form_branding_kind CHECK (kind IN ('HEADER', 'FOOTER')),
        CONSTRAINT chk_form_branding_mode CHECK (mode IN ('FILE', 'CUSTOM')),
        CONSTRAINT chk_form_branding_height CHECK (height_mm BETWEEN 5 AND 100),
        CONSTRAINT chk_form_branding_content CHECK (
          (mode = 'FILE' AND file_path IS NOT NULL AND file_mime IS NOT NULL AND layout IS NULL) OR
          (mode = 'CUSTOM' AND file_path IS NULL AND file_mime IS NULL AND layout IS NOT NULL)
        )
      );
      CREATE UNIQUE INDEX uq_form_branding_default_kind
        ON form_header_footers(kind)
        WHERE is_default = TRUE AND deleted_at IS NULL;
      ALTER TABLE form_template_versions
        ADD COLUMN header_id INTEGER REFERENCES form_header_footers(id) ON DELETE RESTRICT,
        ADD COLUMN footer_id INTEGER REFERENCES form_header_footers(id) ON DELETE RESTRICT,
        ADD COLUMN header_snapshot JSONB,
        ADD COLUMN footer_snapshot JSONB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE form_template_versions
        DROP COLUMN footer_snapshot,
        DROP COLUMN header_snapshot,
        DROP COLUMN footer_id,
        DROP COLUMN header_id;
      DROP TABLE form_header_footers;
    `);
  }
}
