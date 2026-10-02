import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFormChecklistEngine1790971200000 implements MigrationInterface {
  name = 'CreateFormChecklistEngine1790971200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE form_templates (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        kind VARCHAR(20) NOT NULL DEFAULT 'FORM',
        procedure_type VARCHAR(40) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_by_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT chk_form_templates_kind CHECK (kind IN ('FORM', 'CHECKLIST')),
        CONSTRAINT chk_form_templates_procedure CHECK (procedure_type IN (
          'CABINET_PREFABRICATION', 'DEVICE_PRECONFIGURATION', 'FIELD_INSTALLATION'
        ))
      );

      CREATE TABLE form_template_versions (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
        version INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        kind VARCHAR(20) NOT NULL,
        procedure_type VARCHAR(40) NOT NULL,
        settings JSONB NOT NULL DEFAULT '{}',
        published_at TIMESTAMP,
        created_by_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT uq_form_template_version UNIQUE (template_id, version),
        CONSTRAINT chk_form_version_number CHECK (version > 0),
        CONSTRAINT chk_form_version_publication CHECK (
          (status = 'DRAFT' AND published_at IS NULL) OR
          (status = 'PUBLISHED' AND published_at IS NOT NULL)
        ),
        CONSTRAINT chk_form_version_kind CHECK (kind IN ('FORM', 'CHECKLIST')),
        CONSTRAINT chk_form_version_procedure CHECK (procedure_type IN (
          'CABINET_PREFABRICATION', 'DEVICE_PRECONFIGURATION', 'FIELD_INSTALLATION'
        ))
      );

      CREATE TABLE form_sections (
        id SERIAL PRIMARY KEY,
        template_version_id INTEGER NOT NULL REFERENCES form_template_versions(id) ON DELETE RESTRICT,
        key VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        conditions JSONB NOT NULL DEFAULT '{}',
        CONSTRAINT uq_form_section_key UNIQUE (template_version_id, key),
        CONSTRAINT uq_form_section_version UNIQUE (id, template_version_id)
      );
      CREATE INDEX idx_form_sections_order ON form_sections(template_version_id, sort_order);

      CREATE TABLE form_field_definitions (
        id SERIAL PRIMARY KEY,
        template_version_id INTEGER NOT NULL REFERENCES form_template_versions(id) ON DELETE RESTRICT,
        section_id INTEGER NOT NULL,
        key VARCHAR(100) NOT NULL,
        label VARCHAR(255) NOT NULL,
        field_type VARCHAR(100) NOT NULL,
        required BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        validation JSONB NOT NULL DEFAULT '{}',
        options JSONB NOT NULL DEFAULT '{}',
        conditions JSONB NOT NULL DEFAULT '{}',
        CONSTRAINT uq_form_field_key UNIQUE (template_version_id, key),
        CONSTRAINT uq_form_field_version UNIQUE (id, template_version_id),
        CONSTRAINT fk_form_field_section FOREIGN KEY (section_id, template_version_id)
          REFERENCES form_sections(id, template_version_id) ON DELETE RESTRICT
      );
      CREATE INDEX idx_form_fields_order ON form_field_definitions(section_id, sort_order);

      CREATE TABLE form_triggers (
        id SERIAL PRIMARY KEY,
        template_version_id INTEGER NOT NULL REFERENCES form_template_versions(id) ON DELETE RESTRICT,
        event_type VARCHAR(100) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        conditions JSONB NOT NULL DEFAULT '{}',
        CONSTRAINT uq_form_trigger_version UNIQUE (id, template_version_id)
      );
      CREATE INDEX idx_form_triggers_version ON form_triggers(template_version_id);
      CREATE INDEX idx_form_triggers_event ON form_triggers(event_type, active);

      CREATE TABLE form_assignment_rules (
        id SERIAL PRIMARY KEY,
        template_version_id INTEGER NOT NULL REFERENCES form_template_versions(id) ON DELETE RESTRICT,
        trigger_id INTEGER,
        priority INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        conditions JSONB NOT NULL DEFAULT '{}',
        assigned_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
        assigned_team_id INTEGER REFERENCES brigades(id) ON DELETE RESTRICT,
        CONSTRAINT fk_form_assignment_trigger FOREIGN KEY (trigger_id, template_version_id)
          REFERENCES form_triggers(id, template_version_id) ON DELETE RESTRICT,
        CONSTRAINT chk_form_assignment_target CHECK (
          assigned_user_id IS NOT NULL OR assigned_team_id IS NOT NULL
        )
      );
      CREATE INDEX idx_form_assignment_rules_version ON form_assignment_rules(template_version_id, priority);
      CREATE INDEX idx_form_assignment_rules_trigger ON form_assignment_rules(trigger_id);

      CREATE TABLE form_instances (
        id SERIAL PRIMARY KEY,
        template_version_id INTEGER NOT NULL REFERENCES form_template_versions(id) ON DELETE RESTRICT,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        contract_id INTEGER REFERENCES contracts(id) ON DELETE RESTRICT,
        task_id INTEGER REFERENCES tasks(id) ON DELETE RESTRICT,
        subsystem_task_id INTEGER REFERENCES subsystem_tasks(id) ON DELETE RESTRICT,
        object_id INTEGER REFERENCES assets(id) ON DELETE RESTRICT,
        device_id INTEGER REFERENCES devices(id) ON DELETE RESTRICT,
        bom_item_id INTEGER REFERENCES task_generated_bom_items(id) ON DELETE RESTRICT,
        workflow_bom_item_id INTEGER REFERENCES workflow_generated_bom_items(id) ON DELETE RESTRICT,
        assigned_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
        assigned_team_id INTEGER REFERENCES brigades(id) ON DELETE RESTRICT,
        created_by_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
        submitted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT uq_form_instance_version UNIQUE (id, template_version_id),
        CONSTRAINT chk_form_instance_status CHECK (status IN (
          'DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'
        )),
        CONSTRAINT chk_form_instance_bom CHECK (bom_item_id IS NULL OR workflow_bom_item_id IS NULL)
      );
      CREATE INDEX idx_form_instances_version ON form_instances(template_version_id);
      CREATE INDEX idx_form_instances_contract ON form_instances(contract_id);
      CREATE INDEX idx_form_instances_task ON form_instances(task_id);
      CREATE INDEX idx_form_instances_subsystem_task ON form_instances(subsystem_task_id);
      CREATE INDEX idx_form_instances_object ON form_instances(object_id);
      CREATE INDEX idx_form_instances_device ON form_instances(device_id);
      CREATE INDEX idx_form_instances_bom_item ON form_instances(bom_item_id);
      CREATE INDEX idx_form_instances_workflow_bom_item ON form_instances(workflow_bom_item_id);
      CREATE INDEX idx_form_instances_user_status ON form_instances(assigned_user_id, status);
      CREATE INDEX idx_form_instances_team_status ON form_instances(assigned_team_id, status);

      CREATE TABLE form_field_values (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER NOT NULL,
        template_version_id INTEGER NOT NULL,
        field_definition_id INTEGER NOT NULL,
        value JSONB,
        updated_by_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT uq_form_field_value UNIQUE (instance_id, field_definition_id),
        CONSTRAINT fk_form_value_instance FOREIGN KEY (instance_id, template_version_id)
          REFERENCES form_instances(id, template_version_id) ON DELETE RESTRICT,
        CONSTRAINT fk_form_value_field FOREIGN KEY (field_definition_id, template_version_id)
          REFERENCES form_field_definitions(id, template_version_id) ON DELETE RESTRICT
      );
      CREATE INDEX idx_form_values_field ON form_field_values(field_definition_id, template_version_id);

      CREATE TABLE form_value_documents (
        field_value_id INTEGER NOT NULL REFERENCES form_field_values(id) ON DELETE RESTRICT,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
        PRIMARY KEY (field_value_id, document_id)
      );
      CREATE INDEX idx_form_value_documents_document ON form_value_documents(document_id);
      CREATE TABLE form_value_photos (
        field_value_id INTEGER NOT NULL REFERENCES form_field_values(id) ON DELETE RESTRICT,
        photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE RESTRICT,
        PRIMARY KEY (field_value_id, photo_id)
      );
      CREATE INDEX idx_form_value_photos_photo ON form_value_photos(photo_id);

      CREATE TABLE form_approvals (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER NOT NULL REFERENCES form_instances(id) ON DELETE RESTRICT,
        step_key VARCHAR(100) NOT NULL DEFAULT 'approval',
        step_order INTEGER NOT NULL DEFAULT 1,
        round INTEGER NOT NULL DEFAULT 1,
        decision VARCHAR(20) NOT NULL,
        decided_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        comment TEXT,
        metadata JSONB NOT NULL DEFAULT '{}',
        decided_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT chk_form_approval_stage CHECK (round > 0 AND step_order > 0),
        CONSTRAINT chk_form_approval_decision CHECK (decision IN ('APPROVED', 'REJECTED'))
      );
      CREATE INDEX idx_form_approvals_stage ON form_approvals(instance_id, round, step_order);
    `);

    await queryRunner.query(`
      CREATE FUNCTION form_guard_published_version() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF OLD.status = 'PUBLISHED' THEN
          RAISE EXCEPTION 'Published form versions are immutable' USING ERRCODE = '23514';
        END IF;
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER trg_form_version_immutable
        BEFORE UPDATE OR DELETE ON form_template_versions
        FOR EACH ROW EXECUTE FUNCTION form_guard_published_version();

      CREATE FUNCTION form_guard_definition() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE
        version_ids INTEGER[];
        version_row RECORD;
      BEGIN
        IF TG_OP = 'INSERT' THEN
          version_ids := ARRAY[NEW.template_version_id];
        ELSIF TG_OP = 'DELETE' THEN
          version_ids := ARRAY[OLD.template_version_id];
        ELSE
          version_ids := ARRAY[OLD.template_version_id, NEW.template_version_id];
        END IF;
        -- Serialize definition edits with publication; check both sides of a move.
        FOR version_row IN
          SELECT id, status FROM form_template_versions
          WHERE id = ANY(version_ids) ORDER BY id FOR UPDATE
        LOOP
          IF version_row.status = 'PUBLISHED' THEN
            RAISE EXCEPTION 'Published form definitions are immutable' USING ERRCODE = '23514';
          END IF;
        END LOOP;
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER trg_form_sections_immutable
        BEFORE INSERT OR UPDATE OR DELETE ON form_sections
        FOR EACH ROW EXECUTE FUNCTION form_guard_definition();
      CREATE TRIGGER trg_form_fields_immutable
        BEFORE INSERT OR UPDATE OR DELETE ON form_field_definitions
        FOR EACH ROW EXECUTE FUNCTION form_guard_definition();
      CREATE TRIGGER trg_form_triggers_immutable
        BEFORE INSERT OR UPDATE OR DELETE ON form_triggers
        FOR EACH ROW EXECUTE FUNCTION form_guard_definition();
      CREATE TRIGGER trg_form_assignment_rules_immutable
        BEFORE INSERT OR UPDATE OR DELETE ON form_assignment_rules
        FOR EACH ROW EXECUTE FUNCTION form_guard_definition();

      CREATE FUNCTION form_guard_instance_version() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          IF NEW.template_version_id IS DISTINCT FROM OLD.template_version_id THEN
            RAISE EXCEPTION 'Form instance version cannot change' USING ERRCODE = '23514';
          END IF;
        ELSE
          PERFORM id FROM form_template_versions
            WHERE id = NEW.template_version_id AND status = 'PUBLISHED' FOR SHARE;
          IF NOT FOUND THEN
            RAISE EXCEPTION 'Form instances require a published version' USING ERRCODE = '23514';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER trg_form_instance_version
        BEFORE INSERT OR UPDATE ON form_instances
        FOR EACH ROW EXECUTE FUNCTION form_guard_instance_version();

      CREATE FUNCTION form_reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Form history cannot be removed or rewritten' USING ERRCODE = '23514';
      END;
      $$;
      CREATE TRIGGER trg_form_approvals_append_only
        BEFORE UPDATE OR DELETE ON form_approvals
        FOR EACH ROW EXECUTE FUNCTION form_reject_mutation();
      CREATE TRIGGER trg_form_versions_no_truncate BEFORE TRUNCATE ON form_template_versions
        EXECUTE FUNCTION form_reject_mutation();
      CREATE TRIGGER trg_form_sections_no_truncate BEFORE TRUNCATE ON form_sections
        EXECUTE FUNCTION form_reject_mutation();
      CREATE TRIGGER trg_form_fields_no_truncate BEFORE TRUNCATE ON form_field_definitions
        EXECUTE FUNCTION form_reject_mutation();
      CREATE TRIGGER trg_form_triggers_no_truncate BEFORE TRUNCATE ON form_triggers
        EXECUTE FUNCTION form_reject_mutation();
      CREATE TRIGGER trg_form_rules_no_truncate BEFORE TRUNCATE ON form_assignment_rules
        EXECUTE FUNCTION form_reject_mutation();
      CREATE TRIGGER trg_form_approvals_no_truncate BEFORE TRUNCATE ON form_approvals
        EXECUTE FUNCTION form_reject_mutation();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE form_approvals;
      DROP TABLE form_value_photos;
      DROP TABLE form_value_documents;
      DROP TABLE form_field_values;
      DROP TABLE form_instances;
      DROP TABLE form_assignment_rules;
      DROP TABLE form_triggers;
      DROP TABLE form_field_definitions;
      DROP TABLE form_sections;
      DROP TABLE form_template_versions;
      DROP TABLE form_templates;
      DROP FUNCTION form_reject_mutation();
      DROP FUNCTION form_guard_instance_version();
      DROP FUNCTION form_guard_definition();
      DROP FUNCTION form_guard_published_version();
    `);
  }
}
