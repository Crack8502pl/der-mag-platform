import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeviceInstallationWorkflows1793432400000 implements MigrationInterface {
  name = 'CreateDeviceInstallationWorkflows1793432400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE device_installation_workflows (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        preconfiguration_instance_id INTEGER NOT NULL REFERENCES form_instances(id) ON DELETE RESTRICT,
        status VARCHAR(40) NOT NULL,
        ready_at TIMESTAMP NOT NULL,
        field_installation_task_id INTEGER REFERENCES tasks(id) ON DELETE RESTRICT,
        installation_instance_id INTEGER REFERENCES form_instances(id) ON DELETE RESTRICT,
        installed_asset_id INTEGER REFERENCES assets(id) ON DELETE RESTRICT,
        verification_instance_id INTEGER REFERENCES form_instances(id) ON DELETE RESTRICT,
        commissioned_at TIMESTAMP,
        created_by_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT chk_device_installation_workflow_status CHECK (
          status IN ('READY_FOR_FIELD_INSTALLATION', 'INSTALLED', 'VERIFIED', 'COMMISSIONED')
        ),
        CONSTRAINT chk_device_installation_workflow_state CHECK (
          (status = 'READY_FOR_FIELD_INSTALLATION' AND ready_at IS NOT NULL) OR
          (status = 'INSTALLED' AND ready_at IS NOT NULL AND field_installation_task_id IS NOT NULL
            AND installation_instance_id IS NOT NULL AND installed_asset_id IS NOT NULL) OR
          (status = 'VERIFIED' AND ready_at IS NOT NULL AND field_installation_task_id IS NOT NULL
            AND installation_instance_id IS NOT NULL AND installed_asset_id IS NOT NULL
            AND verification_instance_id IS NOT NULL) OR
          (status = 'COMMISSIONED' AND ready_at IS NOT NULL AND field_installation_task_id IS NOT NULL
            AND installation_instance_id IS NOT NULL AND installed_asset_id IS NOT NULL
            AND verification_instance_id IS NOT NULL AND commissioned_at IS NOT NULL)
        )
      );
      CREATE UNIQUE INDEX uq_device_installation_active_device
        ON device_installation_workflows(device_id) WHERE status <> 'COMMISSIONED';
      CREATE UNIQUE INDEX uq_device_installation_preconfiguration
        ON device_installation_workflows(preconfiguration_instance_id);
      CREATE UNIQUE INDEX uq_device_installation_installation_form
        ON device_installation_workflows(installation_instance_id);
      CREATE UNIQUE INDEX uq_device_installation_verification_form
        ON device_installation_workflows(verification_instance_id);
      CREATE INDEX idx_device_installation_status ON device_installation_workflows(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE device_installation_workflows');
  }
}
