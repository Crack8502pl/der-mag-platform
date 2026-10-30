// src/migrations/1714000000000-AddBrigadeIdToTasks.ts
// TypeORM migration to add brigade_id column to tasks table

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrigadeIdToTasks1714000000000 implements MigrationInterface {
  name = 'AddBrigadeIdToTasks1714000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('tasks', 'brigade_id'))) {
      await queryRunner.query(`ALTER TABLE "tasks" ADD COLUMN "brigade_id" integer`);
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'tasks'::regclass
            AND confrelid = 'brigades'::regclass
            AND contype = 'f'
            AND (
              SELECT attnum
              FROM pg_attribute
              WHERE attrelid = 'tasks'::regclass AND attname = 'brigade_id'
            ) = ANY (conkey)
        ) THEN
          ALTER TABLE "tasks"
            ADD CONSTRAINT "FK_tasks_brigade_id"
            FOREIGN KEY ("brigade_id") REFERENCES "brigades"("id") ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_brigade_id" ON "tasks" ("brigade_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_brigade_id"`);
    await queryRunner.query(`
      ALTER TABLE "tasks"
      DROP CONSTRAINT IF EXISTS "FK_tasks_brigade_id",
      DROP COLUMN IF EXISTS "brigade_id"
    `);
  }
}
