// src/migrations/1714000000000-AddBrigadeIdToTasks.ts
// TypeORM migration to add brigade_id column to tasks table

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrigadeIdToTasks1714000000000 implements MigrationInterface {
  name = 'AddBrigadeIdToTasks1714000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD COLUMN IF NOT EXISTS "brigade_id" integer,
      ADD CONSTRAINT "FK_tasks_brigade_id"
        FOREIGN KEY ("brigade_id") REFERENCES "brigades"("id") ON DELETE SET NULL
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
