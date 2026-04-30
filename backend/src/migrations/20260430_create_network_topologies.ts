// src/migrations/20260430_create_network_topologies.ts
// TypeORM migration to create network_topologies table

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNetworkTopologies20260430 implements MigrationInterface {
  name = 'CreateNetworkTopologies20260430';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "network_topologies" (
        "id"               uuid                NOT NULL DEFAULT gen_random_uuid(),
        "name"             varchar(255)        NOT NULL,
        "version"          integer             NOT NULL DEFAULT 1,
        "contract_id"      integer             NOT NULL,
        "subsystem_index"  integer             NOT NULL,
        "subsystem_type"   varchar(100)        NOT NULL,
        "nodes"            jsonb               NOT NULL DEFAULT '[]',
        "connections"      jsonb               NOT NULL DEFAULT '[]',
        "notes"            text,
        "created_at"       timestamp           NOT NULL DEFAULT now(),
        "updated_at"       timestamp           NOT NULL DEFAULT now(),
        CONSTRAINT "PK_network_topologies_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_network_topologies_contract_id"
          FOREIGN KEY ("contract_id")
          REFERENCES "contracts"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_network_topologies_contract_subsystem"
        ON "network_topologies" ("contract_id", "subsystem_index")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_network_topologies_contract_subsystem"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "network_topologies"`);
  }
}
