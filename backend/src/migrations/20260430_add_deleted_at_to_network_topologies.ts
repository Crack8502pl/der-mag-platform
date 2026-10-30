// src/migrations/20260430_add_deleted_at_to_network_topologies.ts
// Migration to add soft-delete column to network_topologies table

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToNetworkTopologies1777507200001 implements MigrationInterface {
  name = 'AddDeletedAtToNetworkTopologies1777507200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "network_topologies"
        ADD COLUMN IF NOT EXISTS "deleted_at" timestamp NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "network_topologies"
        DROP COLUMN IF EXISTS "deleted_at"
    `);
  }
}
