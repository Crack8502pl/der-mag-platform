import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1600000000000 implements MigrationInterface {
    name = 'InitialSchema1600000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasTable('users')) {
            console.log('Initial schema already exists; skipping baseline migration.');
            return;
        }

        await queryRunner.query(`
            CREATE TABLE "roles" (
                "id" SERIAL NOT NULL,
                "name" character varying(50) NOT NULL,
                "description" text,
                "permissions" jsonb NOT NULL DEFAULT '{}',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"),
                CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "bom_templates" (
                "id" SERIAL NOT NULL,
                "uuid" uuid DEFAULT gen_random_uuid(),
                "task_type_id" integer NOT NULL,
                "material_name" character varying(200) NOT NULL,
                "description" text,
                "unit" character varying(50),
                "default_quantity" numeric(10, 2) NOT NULL DEFAULT '1',
                "is_serialized" boolean NOT NULL DEFAULT false,
                "category" character varying(100),
                "system_type" character varying(50),
                "part_number" character varying(100),
                "catalog_number" character varying(100),
                "supplier" character varying(255),
                "unit_price" numeric(10, 2),
                "is_required" boolean NOT NULL DEFAULT false,
                "sort_order" integer NOT NULL DEFAULT '0',
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_76e3cd50fe6be40d008ceb6abb3" UNIQUE ("uuid"),
                CONSTRAINT "PK_af746197a4188c849253edbba21" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "ip_pools" (
                "id" SERIAL NOT NULL,
                "task_type_id" integer NOT NULL,
                "name" character varying(100) NOT NULL,
                "cidr" character varying(50) NOT NULL,
                "network_address" character varying(45) NOT NULL,
                "subnet_mask" character varying(45) NOT NULL,
                "first_ip" character varying(45) NOT NULL,
                "last_ip" character varying(45) NOT NULL,
                "total_addresses" integer NOT NULL,
                "allocated_addresses" jsonb NOT NULL DEFAULT '[]',
                "description" text,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_b02072d25407b853dafa93ca8a1" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_37ced09484662b934c48473994" ON "ip_pools" ("task_type_id", "cidr")
        `);
        await queryRunner.query(`
            CREATE TABLE "activity_templates" (
                "id" SERIAL NOT NULL,
                "task_type_id" integer NOT NULL,
                "name" character varying(200) NOT NULL,
                "description" text,
                "sequence" integer NOT NULL DEFAULT '0',
                "parent_id" integer,
                "requires_photo" boolean NOT NULL DEFAULT false,
                "min_photos" integer NOT NULL DEFAULT '0',
                "is_mandatory" boolean NOT NULL DEFAULT true,
                "configuration" jsonb NOT NULL DEFAULT '{}',
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_5b97772e9a57c3c087df8bf2b70" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_21d6caac646c8e913208fe1150" ON "activity_templates" ("task_type_id", "sequence")
        `);
        await queryRunner.query(`
            CREATE TABLE "task_types" (
                "id" SERIAL NOT NULL,
                "name" character varying(100) NOT NULL,
                "description" text,
                "code" character varying(50) NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "configuration" jsonb NOT NULL DEFAULT '{}',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_82231175ab7d4a8acd363eae667" UNIQUE ("name"),
                CONSTRAINT "UQ_0ea3c457b5cfa806abddd277a54" UNIQUE ("code"),
                CONSTRAINT "PK_232576669c4df1f0a15e1300ce2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "task_materials" (
                "id" SERIAL NOT NULL,
                "task_id" integer NOT NULL,
                "bom_template_id" integer,
                "material_name" character varying(200) NOT NULL,
                "planned_quantity" numeric(10, 2) NOT NULL,
                "used_quantity" numeric(10, 2) NOT NULL DEFAULT '0',
                "unit" character varying(50),
                "category" character varying(100),
                "serialNumbers" jsonb NOT NULL DEFAULT '[]',
                "requires_serial_number" boolean NOT NULL DEFAULT false,
                "notes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_dcfb46b44cd1e572586af8dba44" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "network_pools" (
                "id" SERIAL NOT NULL,
                "name" character varying(100) NOT NULL,
                "cidr_range" character varying(20) NOT NULL,
                "priority" integer NOT NULL DEFAULT '1',
                "is_active" boolean NOT NULL DEFAULT true,
                "description" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cc6d75230211b540b07c5627da2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "device_ip_assignments" (
                "id" SERIAL NOT NULL,
                "allocation_id" integer NOT NULL,
                "ip_address" inet NOT NULL,
                "serial_number" character varying(100),
                "device_category" character varying(20) NOT NULL,
                "device_type" character varying(100) NOT NULL,
                "hostname" character varying(100) NOT NULL,
                "description" text,
                "status" character varying(20) NOT NULL DEFAULT 'PLANNED',
                "configured_by" integer,
                "configured_at" TIMESTAMP,
                "verified_by" integer,
                "verified_at" TIMESTAMP,
                "firmware_version" character varying(50),
                "test_results" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_e4b78970d84ee71e62f1baba737" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "network_allocations" (
                "id" SERIAL NOT NULL,
                "contract_id" integer NOT NULL,
                "subsystem_id" integer NOT NULL,
                "pool_id" integer NOT NULL,
                "system_type" character varying(50) NOT NULL,
                "allocated_range" character varying(20) NOT NULL,
                "gateway" inet NOT NULL,
                "subnet_mask" inet NOT NULL,
                "ntp_server" inet NOT NULL,
                "first_usable_ip" inet NOT NULL,
                "last_usable_ip" inet NOT NULL,
                "total_hosts" integer NOT NULL,
                "used_hosts" integer NOT NULL DEFAULT '0',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "REL_0ba2c63b6e78d122ba7b97925e" UNIQUE ("subsystem_id"),
                CONSTRAINT "PK_17d2f64873b41b1613e8ff1db38" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "workflow_bom_template_items" (
                "id" SERIAL NOT NULL,
                "template_id" integer NOT NULL,
                "part_number" character varying(100),
                "item_name" character varying(200) NOT NULL,
                "description" text,
                "quantity" integer NOT NULL,
                "unit" character varying(20) NOT NULL DEFAULT 'szt',
                "requires_ip" boolean NOT NULL DEFAULT false,
                "device_category" character varying(20),
                "requires_serial_number" boolean NOT NULL DEFAULT false,
                "sequence" integer NOT NULL DEFAULT '1',
                "estimated_price" numeric(10, 2),
                "supplier" character varying(200),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ab80b120d1723c8c2c921723fc6" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "workflow_bom_templates" (
                "id" SERIAL NOT NULL,
                "template_code" character varying(50) NOT NULL,
                "system_type" character varying(50) NOT NULL,
                "name" character varying(200) NOT NULL,
                "description" text,
                "is_active" boolean NOT NULL DEFAULT true,
                "version" integer NOT NULL DEFAULT '1',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_3245e00318abdd04515c5f08e07" UNIQUE ("template_code"),
                CONSTRAINT "PK_431268a5c82a5634c58c51a0752" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_3245e00318abdd04515c5f08e0" ON "workflow_bom_templates" ("template_code")
        `);
        await queryRunner.query(`
            CREATE TABLE "workflow_generated_bom_items" (
                "id" SERIAL NOT NULL,
                "generated_bom_id" integer NOT NULL,
                "template_item_id" integer NOT NULL,
                "item_name" character varying(200) NOT NULL,
                "quantity" integer NOT NULL,
                "unit" character varying(20) NOT NULL DEFAULT 'szt',
                "part_number" character varying(100),
                "requires_ip" boolean NOT NULL DEFAULT false,
                "device_category" character varying(20),
                "sequence" integer NOT NULL DEFAULT '1',
                "status" character varying(20) NOT NULL DEFAULT 'PENDING',
                "scanned_quantity" integer NOT NULL DEFAULT '0',
                "missing_quantity" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_94d8f292e701598b48a89bfdc48" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "workflow_generated_boms" (
                "id" SERIAL NOT NULL,
                "subsystem_id" integer NOT NULL,
                "template_id" integer NOT NULL,
                "status" character varying(30) NOT NULL DEFAULT 'GENERATED',
                "generated_by" integer NOT NULL,
                "generated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4d0aca842b22280625a98d17727" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "pallets" (
                "id" SERIAL NOT NULL,
                "pallet_number" character varying(20) NOT NULL,
                "completion_order_id" integer NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'OPEN',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "closed_at" TIMESTAMP,
                CONSTRAINT "UQ_a8eb3abbaa4566cc1f1cc7818eb" UNIQUE ("pallet_number"),
                CONSTRAINT "PK_48669cf7be61a8bfb12730b4062" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_a8eb3abbaa4566cc1f1cc7818e" ON "pallets" ("pallet_number")
        `);
        await queryRunner.query(`
            INSERT INTO "typeorm_metadata"(
                    "database",
                    "schema",
                    "table",
                    "type",
                    "name",
                    "value"
                )
            VALUES ($1, $2, $3, $4, $5, $6)
        `, ["postgres","public","warehouse_stock","GENERATED_COLUMN","quantity_available","quantity_in_stock - quantity_reserved"]);
        await queryRunner.query(`
            CREATE TABLE "warehouse_stock" (
                "id" SERIAL NOT NULL,
                "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "catalog_number" character varying(200) NOT NULL,
                "material_name" character varying(500) NOT NULL,
                "description" text,
                "category" character varying(200),
                "subcategory" character varying(200),
                "material_type" character varying(50) NOT NULL DEFAULT 'consumable',
                "unit" character varying(50) NOT NULL DEFAULT 'szt',
                "quantity_in_stock" numeric(10, 2) NOT NULL DEFAULT '0',
                "quantity_reserved" numeric(10, 2) NOT NULL DEFAULT '0',
                "quantity_available" numeric(10, 2) GENERATED ALWAYS AS (quantity_in_stock - quantity_reserved) STORED NOT NULL,
                "min_stock_level" numeric(10, 2),
                "max_stock_level" numeric(10, 2),
                "reorder_point" numeric(10, 2),
                "warehouse_location" character varying(500),
                "storage_zone" character varying(100),
                "supplier" character varying(500),
                "supplier_catalog_number" character varying(200),
                "manufacturer" character varying(500),
                "part_number" character varying(200),
                "unit_price" numeric(10, 2),
                "purchase_price" numeric(10, 2),
                "last_purchase_price" numeric(10, 2),
                "average_price" numeric(10, 2),
                "currency" character varying(10) NOT NULL DEFAULT 'PLN',
                "is_serialized" boolean NOT NULL DEFAULT false,
                "is_batch_tracked" boolean NOT NULL DEFAULT false,
                "requires_ip_address" boolean NOT NULL DEFAULT false,
                "is_active" boolean NOT NULL DEFAULT true,
                "is_hazardous" boolean NOT NULL DEFAULT false,
                "requires_certification" boolean NOT NULL DEFAULT false,
                "requires_grounding" boolean NOT NULL DEFAULT false,
                "device_category" character varying(100),
                "technical_specs" jsonb NOT NULL DEFAULT '{}',
                "last_purchase_date" TIMESTAMP,
                "last_stock_check_date" TIMESTAMP,
                "expiry_date" TIMESTAMP,
                "status" character varying(50) NOT NULL DEFAULT 'ACTIVE',
                "image_url" character varying(500),
                "datasheet_url" character varying(500),
                "documents" jsonb NOT NULL DEFAULT '[]',
                "notes" text,
                "internal_notes" text,
                "successor_id" integer,
                "predecessor_id" integer,
                "discontinued_date" TIMESTAMP,
                "replacement_notes" text,
                "created_by" integer,
                "updated_by" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_763cf7eb93aa5311bba7cb54663" UNIQUE ("catalog_number"),
                CONSTRAINT "PK_322b20c9d37694411ea10c733c4" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_763cf7eb93aa5311bba7cb5466" ON "warehouse_stock" ("catalog_number")
        `);
        await queryRunner.query(`
            CREATE TABLE "completion_items" (
                "id" SERIAL NOT NULL,
                "completion_order_id" integer NOT NULL,
                "bom_item_id" integer,
                "generated_bom_item_id" integer,
                "task_material_id" integer,
                "expected_quantity" integer NOT NULL DEFAULT '0',
                "status" character varying(20) NOT NULL DEFAULT 'PENDING',
                "scanned_barcode" character varying(200),
                "serial_number" character varying(100),
                "pallet_id" integer,
                "scanned_quantity" integer NOT NULL DEFAULT '0',
                "issued_quantity" integer NOT NULL DEFAULT '0',
                "scanned_by" integer,
                "scanned_at" TIMESTAMP,
                "notes" text,
                "warehouse_stock_id" integer,
                CONSTRAINT "PK_89ddd0f2a7d73d33af8eeffaa57" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "completion_orders" (
                "id" SERIAL NOT NULL,
                "subsystem_id" integer NOT NULL,
                "generated_bom_id" integer,
                "task_number" character varying(20),
                "assigned_to" integer NOT NULL,
                "status" character varying(30) NOT NULL DEFAULT 'CREATED',
                "decision" character varying(30),
                "decision_notes" text,
                "decision_by" integer,
                "decision_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "completed_at" TIMESTAMP,
                "completed_by_id" integer,
                CONSTRAINT "PK_47b4ae8c4391fa46b0c637ad30a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "prefabrication_devices" (
                "id" SERIAL NOT NULL,
                "prefab_task_id" integer NOT NULL,
                "ip_assignment_id" integer NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'PENDING',
                "configured_at" TIMESTAMP,
                "verified_at" TIMESTAMP,
                "notes" text,
                CONSTRAINT "PK_2689e617933a77ce211f492bb8e" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "prefabrication_tasks" (
                "id" SERIAL NOT NULL,
                "completion_order_id" integer NOT NULL,
                "subsystem_id" integer NOT NULL,
                "assigned_to" integer NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'CREATED',
                "ip_matrix_received" boolean NOT NULL DEFAULT false,
                "materials_received" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "completed_at" TIMESTAMP,
                CONSTRAINT "PK_2de04bae0f896425886b6eed256" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "bom_subsystem_template_items" (
                "id" SERIAL NOT NULL,
                "template_id" integer NOT NULL,
                "warehouse_stock_id" integer,
                "material_name" character varying(200) NOT NULL,
                "catalog_number" character varying(100),
                "unit" character varying(50) NOT NULL DEFAULT 'szt',
                "default_quantity" numeric(10, 2) NOT NULL DEFAULT '1',
                "quantity_source" character varying(50) NOT NULL DEFAULT 'FIXED',
                "config_param_name" character varying(100),
                "depends_on_item_id" integer,
                "dependency_formula" character varying(200),
                "requires_ip" boolean NOT NULL DEFAULT false,
                "requires_serial_number" boolean NOT NULL DEFAULT false,
                "is_required" boolean NOT NULL DEFAULT true,
                "group_name" character varying(100),
                "sort_order" integer NOT NULL DEFAULT '0',
                "notes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_0e867bcee844be43fb5707128ee" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_de122761e82019e28cd02b4e44" ON "bom_subsystem_template_items" ("warehouse_stock_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_03f47c752ff37036da7e94b01e" ON "bom_subsystem_template_items" ("template_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "bom_subsystem_templates" (
                "id" SERIAL NOT NULL,
                "template_name" character varying(200) NOT NULL,
                "subsystem_type" character varying(50) NOT NULL,
                "task_variant" character varying(50),
                "version" numeric(5, 2) NOT NULL DEFAULT '1',
                "is_active" boolean NOT NULL DEFAULT true,
                "description" text,
                "created_by" integer,
                "updated_by" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_8016f0dcdc3a7436dbb0464d5b1" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_5dc07eed3a07ba9d9875ec8420" ON "bom_subsystem_templates" ("subsystem_type", "task_variant", "version")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_f482b4b9bd5a3898e5951d2785" ON "bom_subsystem_templates" ("task_variant")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1be767176b40b4cdde2aa82cbb" ON "bom_subsystem_templates" ("subsystem_type")
        `);
        await queryRunner.query(`
            CREATE TABLE "task_generated_bom_items" (
                "id" SERIAL NOT NULL,
                "task_bom_id" integer NOT NULL,
                "template_item_id" integer,
                "item_name" character varying(255) NOT NULL,
                "catalog_number" character varying(100),
                "quantity" integer NOT NULL DEFAULT '1',
                "unit" character varying(20) NOT NULL DEFAULT 'szt',
                "requires_ip" boolean NOT NULL DEFAULT false,
                "requires_serial_number" boolean NOT NULL DEFAULT false,
                "assigned_ip" character varying(45),
                "scanned_quantity" integer NOT NULL DEFAULT '0',
                "group_name" character varying(100),
                "sort_order" integer NOT NULL DEFAULT '0',
                "device_category" character varying(50),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_9bc16524decbb033093e994d480" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_655819435ab7fc3913c483ebea" ON "task_generated_bom_items" ("requires_ip")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_eddc33e01a0b90ddf96c953e88" ON "task_generated_bom_items" ("task_bom_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "task_generated_boms" (
                "id" SERIAL NOT NULL,
                "task_number" character varying(20) NOT NULL,
                "subsystem_id" integer,
                "template_id" integer,
                "status" character varying(30) NOT NULL DEFAULT 'GENERATED',
                "config_params" jsonb NOT NULL DEFAULT '{}',
                "generated_by" integer,
                "generated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_e4461e882745197163063af3a04" UNIQUE ("task_number"),
                CONSTRAINT "PK_7a3a5f1eb27eafd29d8e7c9a6ed" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_52c5a39be2e50a9e293b8980f9" ON "task_generated_boms" ("subsystem_id")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e4461e882745197163063af3a0" ON "task_generated_boms" ("task_number")
        `);
        await queryRunner.query(`
            CREATE TABLE "subsystem_tasks" (
                "id" SERIAL NOT NULL,
                "subsystem_id" integer NOT NULL,
                "task_number" character varying(20) NOT NULL,
                "task_name" character varying(255) NOT NULL,
                "task_type" character varying(100) NOT NULL,
                "status" character varying(50) NOT NULL DEFAULT 'CREATED',
                "substatus" character varying(50),
                "bom_generated" boolean NOT NULL DEFAULT false,
                "bom_id" integer,
                "task_bom_id" integer,
                "completion_order_id" integer,
                "completion_started_at" TIMESTAMP,
                "completion_completed_at" TIMESTAMP,
                "prefabrication_task_id" integer,
                "prefabrication_started_at" TIMESTAMP,
                "prefabrication_completed_at" TIMESTAMP,
                "deployment_scheduled_at" TIMESTAMP,
                "deployment_completed_at" TIMESTAMP,
                "verification_completed_at" TIMESTAMP,
                "realization_started_at" TIMESTAMP,
                "realization_completed_at" TIMESTAMP,
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "linked_asset_id" integer,
                "task_role" character varying(50),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_0f145c7ac1d84a432323ed29690" UNIQUE ("task_number"),
                CONSTRAINT "PK_a77dcd2997cccc1558a3a5565ca" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4e62c9f998d5d0e856266441a6" ON "subsystem_tasks" ("substatus")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e9edcb788ee65f79f2108b73ec" ON "subsystem_tasks" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_3ec22811d2ac8cf047be07b81b" ON "subsystem_tasks" ("subsystem_id")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_0f145c7ac1d84a432323ed2969" ON "subsystem_tasks" ("task_number")
        `);
        await queryRunner.query(`
            CREATE TABLE "subsystems" (
                "id" SERIAL NOT NULL,
                "subsystem_number" character varying(11) NOT NULL,
                "system_type" character varying(50) NOT NULL,
                "quantity" integer NOT NULL DEFAULT '1',
                "contract_id" integer NOT NULL,
                "status" character varying(30) NOT NULL DEFAULT 'CREATED',
                "ip_pool" character varying(50),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_de476c4474b263ff9e937162c49" UNIQUE ("subsystem_number"),
                CONSTRAINT "PK_3972e689fa782515c059820e46a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_de476c4474b263ff9e937162c4" ON "subsystems" ("subsystem_number")
        `);
        await queryRunner.query(`
            CREATE TABLE "contracts" (
                "id" SERIAL NOT NULL,
                "contract_number" character varying(20) NOT NULL,
                "custom_name" character varying(200) NOT NULL,
                "order_date" date,
                "manager_code" character varying(5),
                "jowisz_ref" character varying(100),
                "linia_kolejowa" character varying(20),
                "project_manager_id" integer,
                "status" character varying(30) NOT NULL DEFAULT 'CREATED',
                "technical_specs" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_db84c172dc74e6271e614b68fbd" UNIQUE ("contract_number"),
                CONSTRAINT "PK_2c7b8f3a7b1acdd49497d83d0fb" PRIMARY KEY ("id")
            );
            COMMENT ON COLUMN "contracts"."technical_specs" IS 'Metadata z Symfonii: ElementId, Guid, Description, AccountNo, itp.'
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_db84c172dc74e6271e614b68fb" ON "contracts" ("contract_number")
        `);
        await queryRunner.query(`
            CREATE TABLE "asset_tasks" (
                "id" SERIAL NOT NULL,
                "asset_id" integer NOT NULL,
                "task_id" integer NOT NULL,
                "task_role" character varying(50) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_64a025f1ff293be0b3239bf1263" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_508ff6474d1bd69094f2546e0f" ON "asset_tasks" ("asset_id", "task_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4842cb6f7e01b8ce0aa37356e1" ON "asset_tasks" ("task_role")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_24b7d400c7c7ad08b1c078e591" ON "asset_tasks" ("task_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_261497a581eaff068e98c2a564" ON "asset_tasks" ("asset_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "asset_status_history" (
                "id" SERIAL NOT NULL,
                "asset_id" integer NOT NULL,
                "old_status" character varying(50),
                "new_status" character varying(50) NOT NULL,
                "changed_by" integer,
                "changed_at" TIMESTAMP NOT NULL DEFAULT now(),
                "reason" text,
                CONSTRAINT "PK_d4d95c3361fed64aa55747bcadb" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_f7f1a1d27204d5357ec28a2614" ON "asset_status_history" ("changed_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_cc05a184626e741ae37b5924b0" ON "asset_status_history" ("asset_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "assets" (
                "id" SERIAL NOT NULL,
                "asset_number" character varying(20) NOT NULL,
                "asset_type" character varying(50) NOT NULL,
                "name" character varying(255) NOT NULL,
                "category" character varying(10),
                "linia_kolejowa" character varying(20),
                "kilometraz" character varying(20),
                "gps_latitude" numeric(10, 8),
                "gps_longitude" numeric(11, 8),
                "google_maps_url" text,
                "miejscowosc" character varying(255),
                "contract_id" integer,
                "subsystem_id" integer,
                "installation_task_id" integer,
                "status" character varying(50) NOT NULL DEFAULT 'planned',
                "planned_installation_date" date,
                "actual_installation_date" date,
                "warranty_expiry_date" date,
                "last_service_date" date,
                "next_service_due_date" date,
                "decommission_date" date,
                "bom_snapshot" jsonb,
                "notes" text,
                "photos_folder" character varying(255),
                "created_by" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_02fbdb95200fc41c39c7818f586" UNIQUE ("asset_number"),
                CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_948c0a5c5f0841ea8a16b12dc7" ON "assets" ("subsystem_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6bddfffa3bb9cf201982f16c89" ON "assets" ("contract_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_06be3e2fd34f70a8e68e518dbf" ON "assets" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_eaa6c65fe7cf634aa3d80f317d" ON "assets" ("asset_type")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_02fbdb95200fc41c39c7818f58" ON "assets" ("asset_number")
        `);
        await queryRunner.query(`
            CREATE TABLE "devices" (
                "id" SERIAL NOT NULL,
                "serial_number" character varying(100) NOT NULL,
                "device_type" character varying(100) NOT NULL,
                "device_model" character varying(100),
                "catalog_number" character varying(200),
                "manufacturer" character varying(100),
                "task_id" integer,
                "installed_asset_id" integer,
                "inventory_status" character varying(50) DEFAULT 'in_stock',
                "status" character varying(50) NOT NULL DEFAULT 'prefabricated',
                "prefabrication_date" TIMESTAMP,
                "verification_date" TIMESTAMP,
                "installation_date" TIMESTAMP,
                "ip_address" character varying(45),
                "location" character varying(200),
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "notes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_cc9e89897e336172fd06367735d" UNIQUE ("serial_number"),
                CONSTRAINT "PK_b1514758245c12daf43486dd1f0" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_cc9e89897e336172fd06367735" ON "devices" ("serial_number")
        `);
        await queryRunner.query(`
            CREATE TABLE "task_activities" (
                "id" SERIAL NOT NULL,
                "task_id" integer NOT NULL,
                "activity_template_id" integer NOT NULL,
                "name" character varying(200) NOT NULL,
                "description" text,
                "sequence" integer NOT NULL DEFAULT '0',
                "is_completed" boolean NOT NULL DEFAULT false,
                "completed_at" TIMESTAMP,
                "completed_by" integer,
                "requires_photo" boolean NOT NULL DEFAULT false,
                "photo_count" integer NOT NULL DEFAULT '0',
                "notes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_b7b39b92ce3a5cd42cf81a0dd3a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "quality_photos" (
                "id" SERIAL NOT NULL,
                "task_id" integer NOT NULL,
                "activity_id" integer,
                "file_path" character varying(500) NOT NULL,
                "thumbnail_path" character varying(500),
                "original_name" character varying(255) NOT NULL,
                "file_size" integer NOT NULL,
                "mime_type" character varying(50) NOT NULL,
                "width" integer,
                "height" integer,
                "gps_latitude" numeric(10, 8),
                "gps_longitude" numeric(11, 8),
                "photo_date" TIMESTAMP,
                "exifData" jsonb NOT NULL DEFAULT '{}',
                "uploaded_by" integer NOT NULL,
                "status" character varying(50) NOT NULL DEFAULT 'pending',
                "approved_by" integer,
                "approved_at" TIMESTAMP,
                "notes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1c77f82a6d9eef0379e9718c7fa" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c5faa2b75487517753cf0f250f" ON "quality_photos" ("task_id", "status")
        `);
        await queryRunner.query(`
            CREATE TABLE "task_metrics" (
                "id" SERIAL NOT NULL,
                "task_id" integer NOT NULL,
                "user_id" integer,
                "metric_type" character varying(50) NOT NULL,
                "metric_value" numeric(10, 2) NOT NULL,
                "unit" character varying(50),
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "recorded_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_de4c7c796c8f094b394e67381b8" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "brigade_members" (
                "id" SERIAL NOT NULL,
                "brigade_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                "workDays" jsonb NOT NULL DEFAULT '[]',
                "valid_from" date NOT NULL,
                "valid_to" date,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_162de64e79b7c7c6c209ea8dbd1" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "service_tasks" (
                "id" SERIAL NOT NULL,
                "task_number" character varying(20) NOT NULL,
                "title" character varying(255) NOT NULL,
                "description" text,
                "variant" character varying(50) NOT NULL,
                "status" character varying(50) NOT NULL DEFAULT 'created',
                "contract_id" integer,
                "subsystem_id" integer,
                "brigade_id" integer,
                "planned_start_date" date,
                "planned_end_date" date,
                "actual_start_date" TIMESTAMP,
                "actual_end_date" TIMESTAMP,
                "priority" integer NOT NULL DEFAULT '0',
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "created_by" integer NOT NULL,
                "gps_latitude" numeric(10, 7),
                "gps_longitude" numeric(10, 7),
                "google_maps_url" character varying(500),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                CONSTRAINT "UQ_8434911c69134ae9c2a4920695b" UNIQUE ("task_number"),
                CONSTRAINT "PK_5a36a89a697c82fd2a1e2a081f0" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_8434911c69134ae9c2a4920695" ON "service_tasks" ("task_number")
        `);
        await queryRunner.query(`
            CREATE TABLE "brigades" (
                "id" SERIAL NOT NULL,
                "code" character varying(20) NOT NULL,
                "name" character varying(100) NOT NULL,
                "description" text,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_8ff11c1e79934240d52f002e3e7" UNIQUE ("code"),
                CONSTRAINT "PK_dea80ec75c9d088b35f467abf86" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "tasks" (
                "id" SERIAL NOT NULL,
                "task_number" character varying(9) NOT NULL,
                "title" character varying(200) NOT NULL,
                "description" text,
                "task_type_id" integer NOT NULL,
                "status" character varying(50) NOT NULL DEFAULT 'created',
                "location" character varying(200),
                "client" character varying(100),
                "contract_number" character varying(100),
                "parent_task_id" integer,
                "contract_id" integer,
                "subsystem_id" integer,
                "brigade_id" integer,
                "task_bom_id" integer,
                "planned_start_date" date,
                "planned_end_date" date,
                "actual_start_date" TIMESTAMP,
                "actual_end_date" TIMESTAMP,
                "priority" integer NOT NULL DEFAULT '0',
                "gps_latitude" numeric(10, 7),
                "gps_longitude" numeric(10, 7),
                "google_maps_url" character varying(500),
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "deleted_at" TIMESTAMP,
                "completed_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_ae394f93fcb0a172c55ee28339d" UNIQUE ("task_number"),
                CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_52933a69d496dc3e8f2ff64a58" ON "tasks" ("subsystem_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dd35bdb872b9065cd75de70e63" ON "tasks" ("contract_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ea76a982cfc3dd4bff34daaf03" ON "tasks" ("task_type_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6086c8dafbae729a930c04d865" ON "tasks" ("status")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_ae394f93fcb0a172c55ee28339" ON "tasks" ("task_number")
        `);
        await queryRunner.query(`
            CREATE TABLE "task_assignments" (
                "id" SERIAL NOT NULL,
                "task_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                "role" character varying(50) NOT NULL DEFAULT 'assigned',
                "assigned_at" TIMESTAMP NOT NULL DEFAULT now(),
                "assigned_by" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_b68f42cf36d807d8a19a96066d7" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_2f1f822596c4af9491d12ff0cb" ON "task_assignments" ("task_id", "user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "username" character varying(50) NOT NULL,
                "email" character varying(100) NOT NULL,
                "password_hash" character varying NOT NULL,
                "first_name" character varying(100) NOT NULL,
                "last_name" character varying(100) NOT NULL,
                "phone" character varying(20),
                "employee_code" character varying(5),
                "alt_employee_code_1" character varying(5),
                "alt_employee_code_2" character varying(5),
                "alt_employee_code_3" character varying(5),
                "role_id" integer NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "last_login" TIMESTAMP,
                "force_password_change" boolean NOT NULL DEFAULT true,
                "password_changed_at" TIMESTAMP,
                "otp_expires_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "deletion_reason" character varying(500),
                "email_automation_paused" boolean NOT NULL DEFAULT false,
                "email_automation_pause_reason" text,
                "email_automation_paused_at" TIMESTAMP,
                "email_automation_paused_by" integer,
                CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "UQ_8ae048b57cb451eb306035b1e69" UNIQUE ("employee_code"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "id" SERIAL NOT NULL,
                "token_id" uuid NOT NULL,
                "user_id" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "expires_at" TIMESTAMP NOT NULL,
                "revoked" boolean NOT NULL DEFAULT false,
                "revoked_at" TIMESTAMP,
                "revoked_by_token_id" uuid,
                "ip_address" character varying(45),
                "user_agent" text,
                "device_fingerprint" character varying(255),
                "remember_me" boolean NOT NULL DEFAULT false,
                CONSTRAINT "UQ_b4bffc4033b7bd52e241210710c" UNIQUE ("token_id"),
                CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ba3bd69c8ad1e799c0256e9e50" ON "refresh_tokens" ("expires_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b85ba602ae65eb5813f09e3cec" ON "refresh_tokens" ("user_id", "revoked")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_b4bffc4033b7bd52e241210710" ON "refresh_tokens" ("token_id")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."material_stocks_source_enum" AS ENUM(
                'manual',
                'csv_import',
                'excel_import',
                'symfonia_api'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "material_stocks" (
                "id" SERIAL NOT NULL,
                "part_number" character varying(100) NOT NULL,
                "name" character varying(255) NOT NULL,
                "description" text,
                "quantity_available" numeric(10, 2) NOT NULL DEFAULT '0',
                "quantity_reserved" numeric(10, 2) NOT NULL DEFAULT '0',
                "unit" character varying(20) NOT NULL DEFAULT 'szt',
                "unit_price" numeric(10, 2),
                "currency" character varying(3) NOT NULL DEFAULT 'PLN',
                "warehouse_location" character varying(100),
                "supplier" character varying(100),
                "min_stock_level" numeric(10, 2),
                "symfonia_id" character varying(100),
                "symfonia_index" character varying(100),
                "barcode" character varying(100),
                "ean_code" character varying(20),
                "source" "public"."material_stocks_source_enum" NOT NULL DEFAULT 'manual',
                "last_import_at" TIMESTAMP,
                "last_import_file" character varying(255),
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_80885b9ec198a2ae0a5e95da366" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_1196f6be70269dec1694107f7d" ON "material_stocks" ("part_number")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."material_import_logs_status_enum" AS ENUM(
                'pending',
                'processing',
                'completed',
                'failed',
                'partial'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "material_import_logs" (
                "id" SERIAL NOT NULL,
                "file_name" character varying(255) NOT NULL,
                "file_type" character varying(20) NOT NULL,
                "file_size" integer NOT NULL,
                "status" "public"."material_import_logs_status_enum" NOT NULL DEFAULT 'pending',
                "total_rows" integer NOT NULL DEFAULT '0',
                "imported_rows" integer NOT NULL DEFAULT '0',
                "updated_rows" integer NOT NULL DEFAULT '0',
                "skipped_rows" integer NOT NULL DEFAULT '0',
                "error_rows" integer NOT NULL DEFAULT '0',
                "errors" jsonb,
                "columnMapping" jsonb,
                "started_at" TIMESTAMP,
                "completed_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "imported_by" integer,
                CONSTRAINT "PK_f5d7fc8c2a561ae4f9f82cf1dc2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "bom_triggers" (
                "id" SERIAL NOT NULL,
                "uuid" uuid DEFAULT gen_random_uuid(),
                "name" character varying(200) NOT NULL,
                "description" text,
                "trigger_event" character varying(50) NOT NULL,
                "trigger_condition" jsonb NOT NULL DEFAULT '{}',
                "action_type" character varying(50) NOT NULL,
                "action_config" jsonb NOT NULL DEFAULT '{}',
                "source_task_type_id" integer,
                "target_task_type_id" integer,
                "priority" integer NOT NULL DEFAULT '10',
                "is_active" boolean NOT NULL DEFAULT true,
                "created_by" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_ecc4a66128f0545ec80b3f63387" UNIQUE ("uuid"),
                CONSTRAINT "PK_4a322319d2125d844688aaa65ff" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_533838e9fc167c7a44d84c2b49" ON "bom_triggers" ("priority")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4665fd302a2f4f962c2f081709" ON "bom_triggers" ("is_active")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4197d0baf6bc96b6dd6a50f73f" ON "bom_triggers" ("trigger_event")
        `);
        await queryRunner.query(`
            CREATE TABLE "bom_trigger_logs" (
                "id" SERIAL NOT NULL,
                "trigger_id" integer NOT NULL,
                "task_id" integer,
                "executed_at" TIMESTAMP NOT NULL DEFAULT now(),
                "success" boolean NOT NULL DEFAULT true,
                "input_data" jsonb NOT NULL DEFAULT '{}',
                "result_data" jsonb NOT NULL DEFAULT '{}',
                "error_message" text,
                CONSTRAINT "PK_292b2ded57865d75ca0ee6fe3ba" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8591f58eb666f4c82085715ba3" ON "bom_trigger_logs" ("success")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ea77e5385633231a3e106ac3cb" ON "bom_trigger_logs" ("executed_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_f294e385c97e5de7ca0256e642" ON "bom_trigger_logs" ("task_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_7afab2cf47ca8df9127d595535" ON "bom_trigger_logs" ("trigger_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "subsystem_documents" (
                "id" SERIAL NOT NULL,
                "subsystem_id" integer NOT NULL,
                "fileName" character varying(255) NOT NULL,
                "originalName" character varying(255) NOT NULL,
                "mimeType" character varying(100) NOT NULL,
                "fileSize" bigint NOT NULL,
                "filePath" text NOT NULL,
                "uploaded_by" integer NOT NULL,
                "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_f507549519617b9733c01b35ecb" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "warehouse_stock_history" (
                "id" SERIAL NOT NULL,
                "warehouse_stock_id" integer NOT NULL,
                "operation_type" character varying(50) NOT NULL,
                "quantity_change" numeric(10, 2),
                "quantity_before" numeric(10, 2),
                "quantity_after" numeric(10, 2),
                "reference_type" character varying(50),
                "reference_id" integer,
                "details" jsonb NOT NULL DEFAULT '{}',
                "notes" text,
                "performed_by" integer,
                "performed_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4e2aee4bcebc6e6e59c7d64666b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9613308a9bc8eea78abad92de6" ON "warehouse_stock_history" ("performed_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_154439e62eb0e2683c664e821d" ON "warehouse_stock_history" ("operation_type")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_626899b20f330dca5877f29074" ON "warehouse_stock_history" ("warehouse_stock_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "warehouse_stock_bom_mapping" (
                "id" SERIAL NOT NULL,
                "warehouse_stock_id" integer NOT NULL,
                "bom_template_id" integer NOT NULL,
                "quantity_per_unit" numeric(10, 2) NOT NULL DEFAULT '1',
                "is_optional" boolean NOT NULL DEFAULT false,
                "is_alternative" boolean NOT NULL DEFAULT false,
                "notes" text,
                "created_by" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_f628d072e3e90c5f92e6080db9f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_c3d238d3e4f110205ef0a213fe" ON "warehouse_stock_bom_mapping" ("warehouse_stock_id", "bom_template_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "warehouse_stock_workflow_bom_mapping" (
                "id" SERIAL NOT NULL,
                "warehouse_stock_id" integer NOT NULL,
                "workflow_bom_template_item_id" integer NOT NULL,
                "quantity_per_unit" numeric(10, 2) NOT NULL DEFAULT '1',
                "is_optional" boolean NOT NULL DEFAULT false,
                "is_alternative" boolean NOT NULL DEFAULT false,
                "notes" text,
                "created_by" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ea38ee6822d2512543868f99bc4" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_1de60d1b0633a80337312e677c" ON "warehouse_stock_workflow_bom_mapping" (
                "warehouse_stock_id",
                "workflow_bom_template_item_id"
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "subsystem_warehouse_stock" (
                "id" SERIAL NOT NULL,
                "subsystem_id" integer NOT NULL,
                "warehouse_stock_id" integer NOT NULL,
                "quantity_required" numeric(10, 2) NOT NULL,
                "quantity_reserved" numeric(10, 2) NOT NULL DEFAULT '0',
                "quantity_allocated" numeric(10, 2) NOT NULL DEFAULT '0',
                "status" character varying(50) NOT NULL DEFAULT 'PENDING',
                "assignment_source" character varying(50) NOT NULL DEFAULT 'MANUAL',
                "notes" text,
                "assigned_by" integer,
                "assigned_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_795e9a37a2cb31284a09a322889" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_9fc0756fc28cb7cdf0d09ed74e" ON "subsystem_warehouse_stock" ("subsystem_id", "warehouse_stock_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "task_warehouse_stock" (
                "id" SERIAL NOT NULL,
                "task_id" integer NOT NULL,
                "warehouse_stock_id" integer NOT NULL,
                "quantity_required" numeric(10, 2) NOT NULL,
                "quantity_reserved" numeric(10, 2) NOT NULL DEFAULT '0',
                "quantity_used" numeric(10, 2) NOT NULL DEFAULT '0',
                "status" character varying(50) NOT NULL DEFAULT 'PENDING',
                "assignment_source" character varying(50) NOT NULL DEFAULT 'MANUAL',
                "notes" text,
                "assigned_by" integer,
                "assigned_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_f5f25e7642e4d5aaa375dbf7b13" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_a605ac1aa32c57f507c39483f5" ON "task_warehouse_stock" ("task_id", "warehouse_stock_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "warehouse_locations" (
                "id" SERIAL NOT NULL,
                "location_code" character varying(50) NOT NULL,
                "location_name" character varying(200) NOT NULL,
                "zone" character varying(100),
                "aisle" character varying(50),
                "rack" character varying(50),
                "shelf" character varying(50),
                "bin" character varying(50),
                "capacity" numeric(10, 2),
                "current_usage" numeric(10, 2) NOT NULL DEFAULT '0',
                "is_active" boolean NOT NULL DEFAULT true,
                "location_type" character varying(50),
                "notes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_7520950074cd1818fd507601a1e" UNIQUE ("location_code"),
                CONSTRAINT "PK_03d900f32f1fcd299452d9eee7f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_7520950074cd1818fd507601a1" ON "warehouse_locations" ("location_code")
        `);
        await queryRunner.query(`
            CREATE TABLE "bom_groups" (
                "id" SERIAL NOT NULL,
                "name" character varying(100) NOT NULL,
                "icon" character varying(10),
                "color" character varying(7),
                "sort_order" integer NOT NULL DEFAULT '0',
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_7cdfe0d69ae8652d8c967e58c9e" UNIQUE ("name"),
                CONSTRAINT "PK_87107195e70812341f188f6c7fc" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_a149390d3907c6fdde72dea3bf" ON "bom_groups" ("sort_order")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b857fad26f6ec489f40c8c4c83" ON "bom_groups" ("is_active")
        `);
        await queryRunner.query(`
            CREATE TABLE "bom_dependency_rules" (
                "id" SERIAL NOT NULL,
                "name" character varying(200) NOT NULL,
                "description" text,
                "conditions" jsonb NOT NULL,
                "condition_operator" character varying(10) NOT NULL DEFAULT 'AND',
                "actions" jsonb NOT NULL,
                "category" character varying(50),
                "system_type" character varying(50),
                "priority" integer NOT NULL DEFAULT '10',
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_603b6f291833c8849a35bf6b77a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "bom_template_dependency_rule_inputs" (
                "id" SERIAL NOT NULL,
                "rule_id" integer NOT NULL,
                "input_type" character varying(20) NOT NULL DEFAULT 'ITEM',
                "source_item_id" integer,
                "source_rule_id" integer,
                "source_param_name" character varying(100),
                "only_if_selected" boolean NOT NULL DEFAULT true,
                "input_multiplier" numeric(10, 2) NOT NULL DEFAULT '1',
                "sort_order" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_e9d0d92241f76f97647c8abb48c" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_3cb74121c95a57fb6141b0763d" ON "bom_template_dependency_rule_inputs" ("source_rule_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_59a7f8d16f1955b0cb395d178e" ON "bom_template_dependency_rule_inputs" ("source_item_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_23de8a318fe477ec964c165e66" ON "bom_template_dependency_rule_inputs" ("rule_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "bom_template_dependency_rule_conditions" (
                "id" SERIAL NOT NULL,
                "rule_id" integer NOT NULL,
                "condition_order" integer NOT NULL DEFAULT '0',
                "comparison_operator" character varying(10) NOT NULL,
                "compare_value" numeric(10, 2) NOT NULL,
                "compare_value_max" numeric(10, 2),
                "result_value" numeric(10, 2) NOT NULL,
                "description" character varying(200),
                CONSTRAINT "PK_c245ca3d7356788e5f802e5e04b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_7c1ab69a7a5c9c426dc72de756" ON "bom_template_dependency_rule_conditions" ("condition_order")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_df357ce2d4ae47106278eda6fe" ON "bom_template_dependency_rule_conditions" ("rule_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "bom_template_dependency_rules" (
                "id" SERIAL NOT NULL,
                "template_id" integer NOT NULL,
                "rule_name" character varying(200) NOT NULL,
                "rule_code" character varying(100),
                "description" text,
                "evaluation_order" integer NOT NULL DEFAULT '0',
                "aggregation_type" character varying(30) NOT NULL DEFAULT 'SUM',
                "math_operation" character varying(30) NOT NULL DEFAULT 'NONE',
                "math_operand" numeric(10, 2),
                "target_item_id" integer,
                "is_active" boolean NOT NULL DEFAULT true,
                "target_warehouse_category" character varying(100),
                "selection_criteria" jsonb,
                "storage_days_param" character varying(100),
                "storage_bitrate_mbps" numeric(5, 2) NOT NULL DEFAULT '4',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_26d31a3d3b56e719a508b9725a7" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_7a67253f353b62bf192158159a" ON "bom_template_dependency_rules" ("is_active")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e3c612bc0a7c25c1bba6d18974" ON "bom_template_dependency_rules" ("evaluation_order")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ca0323ff064aeebb03278d95a2" ON "bom_template_dependency_rules" ("target_item_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_df76571ffe7fba03e500889b3a" ON "bom_template_dependency_rules" ("template_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "document_templates" (
                "id" SERIAL NOT NULL,
                "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" character varying(255) NOT NULL,
                "description" text,
                "type" character varying(20) NOT NULL,
                "file_path" character varying(500) NOT NULL,
                "placeholders" jsonb,
                "task_type_id" integer,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_1f25620430588a86548530dcd6f" UNIQUE ("uuid"),
                CONSTRAINT "PK_0372838b7b7cd3571aef80466d1" PRIMARY KEY ("id")
            );
            COMMENT ON COLUMN "document_templates"."type" IS 'word | excel | pdf';
            COMMENT ON COLUMN "document_templates"."placeholders" IS 'Lista pól do wypełnienia, np. {taskNumber}, {clientName}'
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_f0b4425b1e88cb039de6b68f11" ON "document_templates" ("active")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_5b100ce8fe2530a13fc4ba5e48" ON "document_templates" ("task_type_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "documents" (
                "id" SERIAL NOT NULL,
                "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
                "task_id" integer,
                "name" character varying(255) NOT NULL,
                "description" text,
                "type" character varying(20) NOT NULL,
                "category" character varying(50) NOT NULL,
                "file_path" character varying(500) NOT NULL,
                "file_size" integer NOT NULL,
                "mime_type" character varying(100) NOT NULL,
                "original_filename" character varying(255) NOT NULL,
                "generated_from_template_id" integer,
                "created_by" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_f6ab4fff7a383f1f14013ab270b" UNIQUE ("uuid"),
                CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id")
            );
            COMMENT ON COLUMN "documents"."type" IS 'uploaded | generated';
            COMMENT ON COLUMN "documents"."category" IS 'invoice | protocol | report | bom_list | other'
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_14371caaff44d0801b59b28416" ON "documents" ("created_by")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b20c1ae2c7098e9a822f15aa6f" ON "documents" ("category")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6bcbbfcb9e55fdcae62dfe968d" ON "documents" ("task_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "material_imports" (
                "id" SERIAL NOT NULL,
                "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
                "filename" character varying(255) NOT NULL,
                "status" character varying(20) NOT NULL,
                "total_rows" integer NOT NULL DEFAULT '0',
                "new_items" integer NOT NULL DEFAULT '0',
                "existing_items" integer NOT NULL DEFAULT '0',
                "error_items" integer NOT NULL DEFAULT '0',
                "diff_preview" jsonb,
                "imported_ids" jsonb,
                "imported_by" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "confirmed_at" TIMESTAMP,
                CONSTRAINT "UQ_610d120dbafb19845b96b518a23" UNIQUE ("uuid"),
                CONSTRAINT "PK_89f0b48a441d5f5d51a4f0b9f2a" PRIMARY KEY ("id")
            );
            COMMENT ON COLUMN "material_imports"."status" IS 'pending | preview | confirmed | completed | cancelled';
            COMMENT ON COLUMN "material_imports"."diff_preview" IS 'Podział na: new, existing, errors';
            COMMENT ON COLUMN "material_imports"."imported_ids" IS 'ID dodanych materiałów'
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6c65b4f99f9fbcc9cc1f85aa44" ON "material_imports" ("imported_by")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2746ab557f8ebdc82bfca6e855" ON "material_imports" ("status")
        `);
        await queryRunner.query(`
            CREATE TABLE "system_config" (
                "id" SERIAL NOT NULL,
                "key" character varying(100) NOT NULL,
                "value" text NOT NULL,
                "is_encrypted" boolean NOT NULL DEFAULT false,
                "category" character varying(50),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_by_id" integer,
                CONSTRAINT "UQ_eedd3cd0f227c7fb5eff2204e93" UNIQUE ("key"),
                CONSTRAINT "PK_db4e70ac0d27e588176e9bb44a0" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "notification_schedules" (
                "id" SERIAL NOT NULL,
                "notification_type" character varying(50) NOT NULL,
                "schedule_cron" character varying(50) NOT NULL,
                "last_run" TIMESTAMP,
                "next_run" TIMESTAMP,
                "active" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_a23b6b82168c2cc95d3499cf6a4" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "title" character varying(255) NOT NULL,
                "message" text,
                "type" character varying(20) NOT NULL DEFAULT 'info',
                "module" character varying(100),
                "entity_id" integer,
                "is_read" boolean NOT NULL DEFAULT false,
                "read_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "service_task_activities" (
                "id" SERIAL NOT NULL,
                "service_task_id" integer NOT NULL,
                "performed_by" integer NOT NULL,
                "description" text NOT NULL,
                "activity_type" character varying(50) NOT NULL,
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "performed_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_f32bee3f87f0e7472a3789637ff" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "user_preferences" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "theme" character varying(20) NOT NULL DEFAULT 'grover',
                "email_notifications" boolean NOT NULL DEFAULT true,
                "push_notifications" boolean NOT NULL DEFAULT false,
                "notification_sound" boolean NOT NULL DEFAULT true,
                "two_factor_enabled" boolean NOT NULL DEFAULT false,
                "session_timeout" integer NOT NULL DEFAULT '480',
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_458057fa75b66e68a275647da2e" UNIQUE ("user_id"),
                CONSTRAINT "REL_458057fa75b66e68a275647da2" UNIQUE ("user_id"),
                CONSTRAINT "PK_e8cfb5b31af61cd363a6b6d7c25" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "push_subscriptions" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "endpoint" text NOT NULL,
                "p256dh" character varying(255) NOT NULL,
                "auth" character varying(255) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "expires_at" TIMESTAMP,
                CONSTRAINT "PK_757fc8f00c34f66832668dc2e53" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "photos" (
                "id" SERIAL NOT NULL,
                "filename" character varying NOT NULL,
                "original_name" character varying NOT NULL,
                "file_path" character varying NOT NULL,
                "thumbnail_path" character varying,
                "mime_type" character varying,
                "file_size" integer,
                "album_id" integer,
                "contract_id" integer,
                "task_id" integer,
                "latitude" numeric,
                "longitude" numeric,
                "approval_status" character varying NOT NULL DEFAULT 'pending',
                "approved_by_id" integer,
                "approved_at" TIMESTAMP,
                "uploaded_by_id" integer,
                "description" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_5220c45b8e32d49d767b9b3d725" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "photo_albums" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "contract_id" integer,
                "description" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_da50b3ff1c202323a2987fb6cbc" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."threat_level_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
        `);
        await queryRunner.query(`
            CREATE TABLE "honeypot_logs" (
                "id" SERIAL NOT NULL,
                "ip" character varying(45) NOT NULL,
                "user_agent" text,
                "method" character varying(10) NOT NULL,
                "path" text NOT NULL,
                "headers" jsonb,
                "detected_scanner" character varying(50),
                "honeypot_type" character varying(50),
                "query_params" text,
                "request_body" text,
                "threat_level" "public"."threat_level_enum" NOT NULL DEFAULT 'LOW',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "reviewed" boolean NOT NULL DEFAULT false,
                "notes" text,
                CONSTRAINT "PK_29f18396e64c47ca2e42965e137" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9807238b77dbe48d7bec27286f" ON "honeypot_logs" ("threat_level")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1746fca13e090a36768ac1c554" ON "honeypot_logs" ("created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_3eed99bfe27cbd55964c89f3b8" ON "honeypot_logs" ("detected_scanner")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d7bbd4532bb7e14cd1001d81ec" ON "honeypot_logs" ("ip")
        `);
        await queryRunner.query(`
            CREATE TABLE "user_sessions_log" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "token_id" uuid NOT NULL,
                "login_at" TIMESTAMP NOT NULL DEFAULT now(),
                "logout_at" TIMESTAMP,
                "duration_seconds" integer,
                "ip_address" character varying(45),
                "user_agent" text,
                "last_ip_address" character varying(45),
                "last_user_agent" text,
                "logout_type" character varying(20),
                CONSTRAINT "PK_22a22ebdee0266d6919844af579" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_64ff6dfcc4d8a782510322bb32" ON "user_sessions_log" ("login_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8a6f940a459bb999f52c4f2c0e" ON "user_sessions_log" ("token_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0df2c56d73d27fbecdda13dd05" ON "user_sessions_log" ("user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "cars" (
                "id" SERIAL NOT NULL,
                "symfonia_lp" character varying(20) NOT NULL,
                "registration" character varying(20) NOT NULL,
                "symfonia_element_id" integer,
                "active" boolean NOT NULL DEFAULT true,
                "brigade_id" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "archived_at" TIMESTAMP,
                CONSTRAINT "UQ_e08651fae2b997f667ecfbedc65" UNIQUE ("symfonia_lp"),
                CONSTRAINT "PK_fc218aa84e79b477d55322271b6" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "recorder_specifications" (
                "id" SERIAL NOT NULL,
                "warehouse_stock_id" integer NOT NULL,
                "model_name" character varying(100) NOT NULL,
                "min_cameras" integer NOT NULL DEFAULT '1',
                "max_cameras" integer NOT NULL,
                "disk_slots" integer NOT NULL DEFAULT '1',
                "max_storage_tb" numeric(10, 2),
                "supported_disk_capacities" jsonb NOT NULL DEFAULT '[6,8,10,12,14,18]',
                "requires_extension" boolean NOT NULL DEFAULT false,
                "extension_warehouse_stock_id" integer,
                "is_active" boolean NOT NULL DEFAULT true,
                "notes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c846f8da842492598dc58ac641d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_29ffc5894ee429ef5f1f862827" ON "recorder_specifications" ("min_cameras", "max_cameras")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2cb386ced87cd2506b6b3aecd2" ON "recorder_specifications" ("warehouse_stock_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "disk_specifications" (
                "id" SERIAL NOT NULL,
                "warehouse_stock_id" integer NOT NULL,
                "capacity_tb" numeric(10, 2) NOT NULL,
                "disk_type" character varying(50) NOT NULL DEFAULT 'HDD_SURVEILLANCE',
                "compatible_recorder_ids" jsonb NOT NULL DEFAULT '[]',
                "is_active" boolean NOT NULL DEFAULT true,
                "priority" integer NOT NULL DEFAULT '10',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a74780acc9a23b1c7db0c019beb" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d6c6d372b82c788932d1c37ee8" ON "disk_specifications" ("capacity_tb")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_496168bf8baff365ac1d590fd9" ON "disk_specifications" ("warehouse_stock_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "slican_central_specifications" (
                "id" SERIAL NOT NULL,
                "warehouse_stock_id" integer NOT NULL,
                "model_name" character varying(50) NOT NULL,
                "max_sip_voip_subscribers" integer NOT NULL,
                "max_dph_ip_devices" integer NOT NULL,
                "max_audio_ip_devices" integer NOT NULL,
                "max_ivr_channels" integer NOT NULL,
                "max_conference_channels" integer NOT NULL,
                "max_all_accounts" integer,
                "max_cts_phones_up0_ip" integer,
                "max_concurrent_voice_calls" integer,
                "max_concurrent_video_calls" integer,
                "max_webcti_messengercti_accounts" integer,
                "priority" integer NOT NULL DEFAULT '10',
                "is_active" boolean NOT NULL DEFAULT true,
                "notes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_351bc5c71c43010fc6274dcd652" UNIQUE ("warehouse_stock_id"),
                CONSTRAINT "PK_367b95edf1e3f892e3cc159fcb8" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "slican_license_specifications" (
                "id" SERIAL NOT NULL,
                "warehouse_stock_id" integer NOT NULL,
                "license_type" character varying(50) NOT NULL,
                "package_size" integer NOT NULL,
                "demand_field" character varying(50) NOT NULL,
                "is_active" boolean NOT NULL DEFAULT true,
                "priority" integer NOT NULL DEFAULT '10',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_b798ade1c76058b51ec998ed3dc" UNIQUE ("warehouse_stock_id"),
                CONSTRAINT "PK_85c7ebb931fc32a77d26965024d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "slican_voip_subscriber_formula" (
                "id" integer NOT NULL DEFAULT '1',
                "dph_ip_multiplier" numeric(5, 2) NOT NULL DEFAULT '1',
                "audio_ip_multiplier" numeric(5, 2) NOT NULL DEFAULT '1',
                "cts220_ip_multiplier" numeric(5, 2) NOT NULL DEFAULT '1',
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4d6dfdcf4812e5f9ad36c64814b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "wizard_drafts" (
                "id" SERIAL NOT NULL,
                "wizard_type" character varying(50) NOT NULL,
                "user_id" integer NOT NULL,
                "draft_data" jsonb NOT NULL,
                "current_step" integer,
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "expires_at" TIMESTAMP NOT NULL,
                CONSTRAINT "UQ_6af7c881c162686ca5f3ac7bd18" UNIQUE ("wizard_type", "user_id"),
                CONSTRAINT "PK_d164e3bfa3bb0b26ec26e6f350a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d17ccf7628ddc87c4c6588a30c" ON "wizard_drafts" ("expires_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6af7c881c162686ca5f3ac7bd1" ON "wizard_drafts" ("user_id", "wizard_type")
        `);
        await queryRunner.query(`
            CREATE TABLE "task_relationships" (
                "id" SERIAL NOT NULL,
                "subsystem_id" integer NOT NULL,
                "parent_task_id" integer NOT NULL,
                "child_task_id" integer NOT NULL,
                "parent_type" character varying(50) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_8a0b378a6e87667cb0339a4b0ed" UNIQUE ("parent_task_id", "child_task_id"),
                CONSTRAINT "PK_3f50e3b3ef20fab489ef716e171" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_db1aa678e91044b24e28939bef" ON "task_relationships" ("child_task_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6bbf47b0744dee05f41fbc96f2" ON "task_relationships" ("parent_task_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_31235db534dafa9913fce8e2f1" ON "task_relationships" ("subsystem_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "network_topologies" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "version" integer NOT NULL DEFAULT '1',
                "contract_id" integer NOT NULL,
                "subsystem_index" integer NOT NULL,
                "subsystem_type" character varying(100) NOT NULL,
                "nodes" jsonb NOT NULL DEFAULT '[]',
                "connections" jsonb NOT NULL DEFAULT '[]',
                "notes" text,
                "deleted_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_98fda3ef6ea391bd16ed755d0f7" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_f93ad3648a71aca8ef7487a998" ON "network_topologies" ("contract_id", "subsystem_index")
        `);
        await queryRunner.query(`
            CREATE TABLE "railway_stations" (
                "id" SERIAL NOT NULL,
                "name" character varying(200) NOT NULL,
                "code" character varying(20),
                "line_code" character varying(20) NOT NULL,
                "line_id" integer,
                "type" character varying(30) NOT NULL DEFAULT 'stacja',
                "km_position" numeric(8, 3),
                "latitude" numeric(10, 7),
                "longitude" numeric(10, 7),
                "municipality" character varying(100),
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a2adf65e83d94680546a83d60f5" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2db1b14ff0ade598ca84a8068a" ON "railway_stations" ("line_code")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_35317362f8b3e3a1d97418c55c" ON "railway_stations" ("line_code", "km_position")
        `);
        await queryRunner.query(`
            CREATE TABLE "railway_lines" (
                "id" SERIAL NOT NULL,
                "code" character varying(20) NOT NULL,
                "name" character varying(200) NOT NULL,
                "length_km" numeric(8, 3),
                "km_from" numeric(8, 3),
                "km_to" numeric(8, 3),
                "manager" character varying(100),
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_3d6183a8a8a3c1aa1af1ccfb2d4" UNIQUE ("code"),
                CONSTRAINT "PK_92d4445b23feba38e6e8da1742f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_3d6183a8a8a3c1aa1af1ccfb2d" ON "railway_lines" ("code")
        `);
        await queryRunner.query(`
            CREATE TABLE "webhook_configs" (
                "id" SERIAL NOT NULL,
                "provider" character varying(20) NOT NULL,
                "webhook_url" character varying(500) NOT NULL,
                "event_type" character varying(50) NOT NULL,
                "channel_name" character varying(100),
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_b6d2d3606e01c28d476122185b6" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "email_automation_audit_log" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "actor_admin_id" integer,
                "target_type" character varying(20) NOT NULL,
                "target_id" integer,
                "field" character varying(100) NOT NULL,
                "old_value" character varying(255),
                "new_value" character varying(255),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_d166d3052fe30e83537754114e7" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "form_field_definitions" (
                "id" SERIAL NOT NULL,
                "template_version_id" integer NOT NULL,
                "section_id" integer NOT NULL,
                "key" character varying(100) NOT NULL,
                "label" character varying(255) NOT NULL,
                "field_type" character varying(100) NOT NULL,
                "required" boolean NOT NULL DEFAULT false,
                "sort_order" integer NOT NULL DEFAULT '0',
                "validation" jsonb NOT NULL DEFAULT '{}',
                "options" jsonb NOT NULL DEFAULT '{}',
                "conditions" jsonb NOT NULL DEFAULT '{}',
                CONSTRAINT "uq_form_field_version" UNIQUE ("id", "template_version_id"),
                CONSTRAINT "uq_form_field_key" UNIQUE ("template_version_id", "key"),
                CONSTRAINT "PK_5ab39b9089d674fa598f39c8141" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_fields_order" ON "form_field_definitions" ("section_id", "sort_order")
        `);
        await queryRunner.query(`
            CREATE TABLE "form_sections" (
                "id" SERIAL NOT NULL,
                "template_version_id" integer NOT NULL,
                "key" character varying(100) NOT NULL,
                "title" character varying(255) NOT NULL,
                "description" text,
                "sort_order" integer NOT NULL DEFAULT '0',
                "conditions" jsonb NOT NULL DEFAULT '{}',
                CONSTRAINT "uq_form_section_version" UNIQUE ("id", "template_version_id"),
                CONSTRAINT "uq_form_section_key" UNIQUE ("template_version_id", "key"),
                CONSTRAINT "PK_c1a1f14ff6a8f2f017e90261e2d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_sections_order" ON "form_sections" ("template_version_id", "sort_order")
        `);
        await queryRunner.query(`
            CREATE TABLE "form_assignment_rules" (
                "id" SERIAL NOT NULL,
                "template_version_id" integer NOT NULL,
                "trigger_id" integer,
                "priority" integer NOT NULL DEFAULT '0',
                "active" boolean NOT NULL DEFAULT true,
                "conditions" jsonb NOT NULL DEFAULT '{}',
                "assigned_user_id" integer,
                "assigned_team_id" integer,
                CONSTRAINT "chk_form_assignment_target" CHECK (
                    "assigned_user_id" IS NOT NULL
                    OR "assigned_team_id" IS NOT NULL
                ),
                CONSTRAINT "PK_83b37dfd058dc5df0b692f1bfad" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_assignment_rules_trigger" ON "form_assignment_rules" ("trigger_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_assignment_rules_version" ON "form_assignment_rules" ("template_version_id", "priority")
        `);
        await queryRunner.query(`
            CREATE TABLE "form_triggers" (
                "id" SERIAL NOT NULL,
                "template_version_id" integer NOT NULL,
                "event_type" character varying(100) NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "conditions" jsonb NOT NULL DEFAULT '{}',
                CONSTRAINT "uq_form_trigger_version" UNIQUE ("id", "template_version_id"),
                CONSTRAINT "PK_6a80df691e3b70a068f2d05f5d6" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_triggers_event" ON "form_triggers" ("event_type", "active")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_triggers_version" ON "form_triggers" ("template_version_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "form_field_values" (
                "id" SERIAL NOT NULL,
                "instance_id" integer NOT NULL,
                "template_version_id" integer NOT NULL,
                "field_definition_id" integer NOT NULL,
                "value" jsonb,
                "updated_by_id" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "uq_form_field_value" UNIQUE ("instance_id", "field_definition_id"),
                CONSTRAINT "PK_e3cfb4acffd5c3754c2e76f425e" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_values_field" ON "form_field_values" ("field_definition_id", "template_version_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "form_approvals" (
                "id" SERIAL NOT NULL,
                "instance_id" integer NOT NULL,
                "step_key" character varying(100) NOT NULL DEFAULT 'approval',
                "step_order" integer NOT NULL DEFAULT '1',
                "round" integer NOT NULL DEFAULT '1',
                "decision" character varying(20) NOT NULL,
                "decided_by_id" integer NOT NULL,
                "comment" text,
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "decided_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "chk_form_approval_decision" CHECK ("decision" IN ('APPROVED', 'REJECTED')),
                CONSTRAINT "chk_form_approval_stage" CHECK (
                    "round" > 0
                    AND "step_order" > 0
                ),
                CONSTRAINT "PK_ba856a3ea5032b4970a3b232c33" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_approvals_stage" ON "form_approvals" ("instance_id", "round", "step_order")
        `);
        await queryRunner.query(`
            CREATE TABLE "form_instances" (
                "id" SERIAL NOT NULL,
                "template_version_id" integer NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'DRAFT',
                "contract_id" integer,
                "task_id" integer,
                "subsystem_task_id" integer,
                "object_id" integer,
                "device_id" integer,
                "bom_item_id" integer,
                "workflow_bom_item_id" integer,
                "assigned_user_id" integer,
                "assigned_team_id" integer,
                "created_by_id" integer,
                "submitted_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "uq_form_instance_version" UNIQUE ("id", "template_version_id"),
                CONSTRAINT "chk_form_instance_bom" CHECK (
                    "bom_item_id" IS NULL
                    OR "workflow_bom_item_id" IS NULL
                ),
                CONSTRAINT "chk_form_instance_status" CHECK (
                    "status" IN (
                        'DRAFT',
                        'IN_PROGRESS',
                        'SUBMITTED',
                        'APPROVED',
                        'REJECTED',
                        'CANCELLED'
                    )
                ),
                CONSTRAINT "PK_1352909b786b1840724b4503934" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_instances_team_status" ON "form_instances" ("assigned_team_id", "status")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_instances_user_status" ON "form_instances" ("assigned_user_id", "status")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_instances_workflow_bom_item" ON "form_instances" ("workflow_bom_item_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_instances_bom_item" ON "form_instances" ("bom_item_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_instances_device" ON "form_instances" ("device_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_instances_object" ON "form_instances" ("object_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_instances_subsystem_task" ON "form_instances" ("subsystem_task_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_instances_task" ON "form_instances" ("task_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_instances_contract" ON "form_instances" ("contract_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_form_instances_version" ON "form_instances" ("template_version_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "form_template_versions" (
                "id" SERIAL NOT NULL,
                "template_id" integer NOT NULL,
                "version" integer NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'DRAFT',
                "title" character varying(255) NOT NULL,
                "description" text,
                "kind" character varying(20) NOT NULL,
                "procedure_type" character varying(40) NOT NULL,
                "settings" jsonb NOT NULL DEFAULT '{}',
                "published_at" TIMESTAMP,
                "created_by_id" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "uq_form_template_version" UNIQUE ("template_id", "version"),
                CONSTRAINT "chk_form_version_procedure" CHECK (
                    "procedure_type" IN (
                        'CABINET_PREFABRICATION',
                        'DEVICE_PRECONFIGURATION',
                        'FIELD_INSTALLATION'
                    )
                ),
                CONSTRAINT "chk_form_version_kind" CHECK ("kind" IN ('FORM', 'CHECKLIST')),
                CONSTRAINT "chk_form_version_publication" CHECK (
                    (
                        "status" = 'DRAFT'
                        AND "published_at" IS NULL
                    )
                    OR (
                        "status" = 'PUBLISHED'
                        AND "published_at" IS NOT NULL
                    )
                ),
                CONSTRAINT "chk_form_version_number" CHECK ("version" > 0),
                CONSTRAINT "PK_a2f09ca3e134fbe6cd5822cfa58" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "form_templates" (
                "id" SERIAL NOT NULL,
                "key" character varying(100) NOT NULL,
                "name" character varying(255) NOT NULL,
                "description" text,
                "kind" character varying(20) NOT NULL DEFAULT 'FORM',
                "procedure_type" character varying(40) NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "created_by_id" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_45f900dcf3651c08a0e824ccba3" UNIQUE ("key"),
                CONSTRAINT "chk_form_templates_procedure" CHECK (
                    "procedure_type" IN (
                        'CABINET_PREFABRICATION',
                        'DEVICE_PRECONFIGURATION',
                        'FIELD_INSTALLATION'
                    )
                ),
                CONSTRAINT "chk_form_templates_kind" CHECK ("kind" IN ('FORM', 'CHECKLIST')),
                CONSTRAINT "PK_dda93f70be71cb4a2e496b5ae49" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "form_value_documents" (
                "field_value_id" integer NOT NULL,
                "document_id" integer NOT NULL,
                CONSTRAINT "PK_e1d116b80e78ef886537f998391" PRIMARY KEY ("field_value_id", "document_id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_bfd3bfcdfa15c7642381b38a7c" ON "form_value_documents" ("field_value_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ffb28226691bae93fdf8443dde" ON "form_value_documents" ("document_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "form_value_photos" (
                "field_value_id" integer NOT NULL,
                "photo_id" integer NOT NULL,
                CONSTRAINT "PK_97bf9db318894eb135613eee5ba" PRIMARY KEY ("field_value_id", "photo_id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_7582bb66d7b21a24b143f78a90" ON "form_value_photos" ("field_value_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b49ded22d694a9f5008a8d9b20" ON "form_value_photos" ("photo_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_templates"
            ADD CONSTRAINT "FK_255b1ea387e0195c8271281f859" FOREIGN KEY ("task_type_id") REFERENCES "task_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ip_pools"
            ADD CONSTRAINT "FK_adde2534e9e3080c3ba0c292188" FOREIGN KEY ("task_type_id") REFERENCES "task_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "activity_templates"
            ADD CONSTRAINT "FK_8c269ec20b25fd395ab386e85b8" FOREIGN KEY ("task_type_id") REFERENCES "task_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "activity_templates"
            ADD CONSTRAINT "FK_f5d86034ce333c6b6a07d9d9817" FOREIGN KEY ("parent_id") REFERENCES "activity_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_materials"
            ADD CONSTRAINT "FK_8d0de7665ca44911c0e2226b1c3" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_materials"
            ADD CONSTRAINT "FK_e5dc641062ece8c4fb3671b005c" FOREIGN KEY ("bom_template_id") REFERENCES "bom_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "device_ip_assignments"
            ADD CONSTRAINT "FK_af1f6c37bec30d65928782c5109" FOREIGN KEY ("allocation_id") REFERENCES "network_allocations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "network_allocations"
            ADD CONSTRAINT "FK_bfe2f64b3fa5ef1c306b36fca33" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "network_allocations"
            ADD CONSTRAINT "FK_0ba2c63b6e78d122ba7b97925e9" FOREIGN KEY ("subsystem_id") REFERENCES "subsystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "network_allocations"
            ADD CONSTRAINT "FK_a4b44dfb15187232067ce5f882e" FOREIGN KEY ("pool_id") REFERENCES "network_pools"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_bom_template_items"
            ADD CONSTRAINT "FK_2b98cbc3a163f04246b71d74452" FOREIGN KEY ("template_id") REFERENCES "workflow_bom_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_generated_bom_items"
            ADD CONSTRAINT "FK_d7f2c0fc4ec85457f1683457845" FOREIGN KEY ("generated_bom_id") REFERENCES "workflow_generated_boms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_generated_bom_items"
            ADD CONSTRAINT "FK_ca3de2c549b04e0333f23302815" FOREIGN KEY ("template_item_id") REFERENCES "workflow_bom_template_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_generated_boms"
            ADD CONSTRAINT "FK_895bb917c4ea238f35f1293fafd" FOREIGN KEY ("subsystem_id") REFERENCES "subsystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_generated_boms"
            ADD CONSTRAINT "FK_4a4ec03d2312bc3454b7b41d9cf" FOREIGN KEY ("template_id") REFERENCES "workflow_bom_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "pallets"
            ADD CONSTRAINT "FK_ef0d5d27b31865332aa729ccfbe" FOREIGN KEY ("completion_order_id") REFERENCES "completion_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock"
            ADD CONSTRAINT "FK_bb86d89df5e170f9ef6cefd49db" FOREIGN KEY ("successor_id") REFERENCES "warehouse_stock"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock"
            ADD CONSTRAINT "FK_6d7c0691e8b558cc09bfdb53aed" FOREIGN KEY ("predecessor_id") REFERENCES "warehouse_stock"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock"
            ADD CONSTRAINT "FK_da95cada4dec0749aa7e3893f11" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock"
            ADD CONSTRAINT "FK_cdd5768cf95a196b6265ee53c73" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_items"
            ADD CONSTRAINT "FK_e2e36ac0af735cb275e2d7834f8" FOREIGN KEY ("completion_order_id") REFERENCES "completion_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_items"
            ADD CONSTRAINT "FK_ec2d2a952974e74421d944f2fd0" FOREIGN KEY ("bom_item_id") REFERENCES "workflow_generated_bom_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_items"
            ADD CONSTRAINT "FK_caf10393bd5f8809fd1ca532fa7" FOREIGN KEY ("task_material_id") REFERENCES "task_materials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_items"
            ADD CONSTRAINT "FK_2b1f98ef513c49c61913b817873" FOREIGN KEY ("pallet_id") REFERENCES "pallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_items"
            ADD CONSTRAINT "FK_be5582d63869387ec12af032281" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stock"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_orders"
            ADD CONSTRAINT "FK_43e4b78076810ba9cf40da31172" FOREIGN KEY ("subsystem_id") REFERENCES "subsystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_orders"
            ADD CONSTRAINT "FK_1c70ee1262f936268fc7221fc29" FOREIGN KEY ("generated_bom_id") REFERENCES "workflow_generated_boms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_orders"
            ADD CONSTRAINT "FK_aca1e4f18b0cdad2c73b8308863" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_orders"
            ADD CONSTRAINT "FK_f97949f5bf427853167435d2e31" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "prefabrication_devices"
            ADD CONSTRAINT "FK_c4e7f1023884b30ff0da5303fd1" FOREIGN KEY ("prefab_task_id") REFERENCES "prefabrication_tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "prefabrication_devices"
            ADD CONSTRAINT "FK_470eb113538cd571f78d07c7ca3" FOREIGN KEY ("ip_assignment_id") REFERENCES "device_ip_assignments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "prefabrication_tasks"
            ADD CONSTRAINT "FK_df826cc67f99cab84a7cfcccfe3" FOREIGN KEY ("completion_order_id") REFERENCES "completion_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "prefabrication_tasks"
            ADD CONSTRAINT "FK_65e02aa3ffdfc40a93e1641e728" FOREIGN KEY ("subsystem_id") REFERENCES "subsystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "prefabrication_tasks"
            ADD CONSTRAINT "FK_0f0e137c624c9ba1534c25352f8" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_subsystem_template_items"
            ADD CONSTRAINT "FK_03f47c752ff37036da7e94b01e8" FOREIGN KEY ("template_id") REFERENCES "bom_subsystem_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_subsystem_template_items"
            ADD CONSTRAINT "FK_de122761e82019e28cd02b4e44f" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stock"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_subsystem_template_items"
            ADD CONSTRAINT "FK_074bbfdba7b7c9d889b5ed51d7b" FOREIGN KEY ("depends_on_item_id") REFERENCES "bom_subsystem_template_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_subsystem_templates"
            ADD CONSTRAINT "FK_5d98582c3ef943f84c1f69beb51" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_subsystem_templates"
            ADD CONSTRAINT "FK_e33f4ebe006aa4f800ff3285c59" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_generated_bom_items"
            ADD CONSTRAINT "FK_eddc33e01a0b90ddf96c953e88c" FOREIGN KEY ("task_bom_id") REFERENCES "task_generated_boms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_generated_bom_items"
            ADD CONSTRAINT "FK_65683e538824272508c6645000a" FOREIGN KEY ("template_item_id") REFERENCES "bom_subsystem_template_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_generated_boms"
            ADD CONSTRAINT "FK_52c5a39be2e50a9e293b8980f97" FOREIGN KEY ("subsystem_id") REFERENCES "subsystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_generated_boms"
            ADD CONSTRAINT "FK_3cbf1b67c844bda516cb184bbef" FOREIGN KEY ("template_id") REFERENCES "bom_subsystem_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_generated_boms"
            ADD CONSTRAINT "FK_dca2ce0650e18ba9a40b4327c7d" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_tasks"
            ADD CONSTRAINT "FK_3ec22811d2ac8cf047be07b81b9" FOREIGN KEY ("subsystem_id") REFERENCES "subsystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_tasks"
            ADD CONSTRAINT "FK_f0c8e18d8dfbc04a09a2bf2d030" FOREIGN KEY ("bom_id") REFERENCES "workflow_generated_boms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_tasks"
            ADD CONSTRAINT "FK_c0186ec7306c9bd2d4e7c7e051b" FOREIGN KEY ("task_bom_id") REFERENCES "task_generated_boms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_tasks"
            ADD CONSTRAINT "FK_b03e4b8f8471bafc8acdfbc56ee" FOREIGN KEY ("completion_order_id") REFERENCES "completion_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_tasks"
            ADD CONSTRAINT "FK_4b47de5f07172a9e1e8b6cf8eaf" FOREIGN KEY ("prefabrication_task_id") REFERENCES "prefabrication_tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_tasks"
            ADD CONSTRAINT "FK_78662dfd1bf1984da54cdef2d20" FOREIGN KEY ("linked_asset_id") REFERENCES "assets"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystems"
            ADD CONSTRAINT "FK_7ee012a6c3e940c3c35ea6bb988" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "contracts"
            ADD CONSTRAINT "FK_cb7d02b9a4d6b88327a58268ed4" FOREIGN KEY ("project_manager_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "asset_tasks"
            ADD CONSTRAINT "FK_261497a581eaff068e98c2a5648" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "asset_tasks"
            ADD CONSTRAINT "FK_24b7d400c7c7ad08b1c078e5911" FOREIGN KEY ("task_id") REFERENCES "subsystem_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "asset_status_history"
            ADD CONSTRAINT "FK_cc05a184626e741ae37b5924b03" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "asset_status_history"
            ADD CONSTRAINT "FK_5b5eaf8239efb2ad06ad2af00c6" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "assets"
            ADD CONSTRAINT "FK_6bddfffa3bb9cf201982f16c890" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "assets"
            ADD CONSTRAINT "FK_948c0a5c5f0841ea8a16b12dc70" FOREIGN KEY ("subsystem_id") REFERENCES "subsystems"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "assets"
            ADD CONSTRAINT "FK_705d21f1e137a31e33a9077acd2" FOREIGN KEY ("installation_task_id") REFERENCES "subsystem_tasks"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "assets"
            ADD CONSTRAINT "FK_dccd1dbe2c036b9ab80876466b7" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "devices"
            ADD CONSTRAINT "FK_4eb995e835dc2031ae8a066b5d2" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "devices"
            ADD CONSTRAINT "FK_f9ce6fbc31f7ee9a6bd03147eea" FOREIGN KEY ("installed_asset_id") REFERENCES "assets"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_activities"
            ADD CONSTRAINT "FK_6c16dbc1f4693fc90f1a7f87a96" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_activities"
            ADD CONSTRAINT "FK_a407226e413613a8ea4cf9f48cb" FOREIGN KEY ("activity_template_id") REFERENCES "activity_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_activities"
            ADD CONSTRAINT "FK_167e0fe1bf8fc0edfd1a655dd97" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "quality_photos"
            ADD CONSTRAINT "FK_00860f829b5db7fca9b70edf3c4" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "quality_photos"
            ADD CONSTRAINT "FK_b8e2d42e3aaa1c850e437787a8f" FOREIGN KEY ("activity_id") REFERENCES "task_activities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "quality_photos"
            ADD CONSTRAINT "FK_ab7328e76a5ed39873676040c71" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "quality_photos"
            ADD CONSTRAINT "FK_fbc7838b92807f11120003c28ae" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_metrics"
            ADD CONSTRAINT "FK_152cdcd060db8b6d4078be470a5" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_metrics"
            ADD CONSTRAINT "FK_450eca6d979cca9e69ab34a84bc" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "brigade_members"
            ADD CONSTRAINT "FK_e76bd91bc769f5720a94073e170" FOREIGN KEY ("brigade_id") REFERENCES "brigades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "brigade_members"
            ADD CONSTRAINT "FK_49d1774039eaf22828d835f52aa" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "service_tasks"
            ADD CONSTRAINT "FK_da8959f9387df412b88b3d258a1" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "service_tasks"
            ADD CONSTRAINT "FK_2e556e092ae37f222ec28cf94ba" FOREIGN KEY ("subsystem_id") REFERENCES "subsystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "service_tasks"
            ADD CONSTRAINT "FK_1f180e71cd4fa47290b62f6db72" FOREIGN KEY ("brigade_id") REFERENCES "brigades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "service_tasks"
            ADD CONSTRAINT "FK_76725e5686da81288f39e12164e" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "tasks"
            ADD CONSTRAINT "FK_ea76a982cfc3dd4bff34daaf036" FOREIGN KEY ("task_type_id") REFERENCES "task_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "tasks"
            ADD CONSTRAINT "FK_54fc42a253a8338488ec1f960ad" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "tasks"
            ADD CONSTRAINT "FK_dd35bdb872b9065cd75de70e639" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "tasks"
            ADD CONSTRAINT "FK_52933a69d496dc3e8f2ff64a58d" FOREIGN KEY ("subsystem_id") REFERENCES "subsystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "tasks"
            ADD CONSTRAINT "FK_16d56f58865354ff7c94d2e1e70" FOREIGN KEY ("brigade_id") REFERENCES "brigades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "tasks"
            ADD CONSTRAINT "FK_eab268b2a64d9b7a0779904d2dc" FOREIGN KEY ("task_bom_id") REFERENCES "task_generated_boms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_assignments"
            ADD CONSTRAINT "FK_b389f4488d0a8241c3c98273966" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_assignments"
            ADD CONSTRAINT "FK_1673eab025dbc14e188bd4df67c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_assignments"
            ADD CONSTRAINT "FK_69edf4d835d0e50fdad8d155d5f" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "refresh_tokens"
            ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "material_import_logs"
            ADD CONSTRAINT "FK_e52a78c108aa5c6be775a83437b" FOREIGN KEY ("imported_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_triggers"
            ADD CONSTRAINT "FK_bf79a4d53729146f4c87e8928a4" FOREIGN KEY ("source_task_type_id") REFERENCES "task_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_triggers"
            ADD CONSTRAINT "FK_26a8411fc20be937c8817495243" FOREIGN KEY ("target_task_type_id") REFERENCES "task_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_triggers"
            ADD CONSTRAINT "FK_72a52faadece3e9c99a97b9189b" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_trigger_logs"
            ADD CONSTRAINT "FK_7afab2cf47ca8df9127d5955355" FOREIGN KEY ("trigger_id") REFERENCES "bom_triggers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_trigger_logs"
            ADD CONSTRAINT "FK_f294e385c97e5de7ca0256e642e" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_documents"
            ADD CONSTRAINT "FK_7a44afd4efa831984103e368c71" FOREIGN KEY ("subsystem_id") REFERENCES "subsystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_documents"
            ADD CONSTRAINT "FK_736734656efdcb5d4095cafe121" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_history"
            ADD CONSTRAINT "FK_626899b20f330dca5877f290747" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_history"
            ADD CONSTRAINT "FK_3691673324fc77006d06697d7d8" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_bom_mapping"
            ADD CONSTRAINT "FK_b131594f7875cac197f22be9467" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_bom_mapping"
            ADD CONSTRAINT "FK_a64e7f3ac4233b16e993054060c" FOREIGN KEY ("bom_template_id") REFERENCES "bom_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_bom_mapping"
            ADD CONSTRAINT "FK_dce3b1af1940f58cce665f452fb" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_workflow_bom_mapping"
            ADD CONSTRAINT "FK_692253eab5114436615b1bc7dca" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_workflow_bom_mapping"
            ADD CONSTRAINT "FK_ebdea29236a265c1a72381a04d1" FOREIGN KEY ("workflow_bom_template_item_id") REFERENCES "workflow_bom_template_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_workflow_bom_mapping"
            ADD CONSTRAINT "FK_dea88058943588709ee65e72a0f" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_warehouse_stock"
            ADD CONSTRAINT "FK_c5d1b54be2aabcbe65f01a61d71" FOREIGN KEY ("subsystem_id") REFERENCES "subsystems"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_warehouse_stock"
            ADD CONSTRAINT "FK_9d21e37dcdbc3bdcc3dc36e9ae4" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_warehouse_stock"
            ADD CONSTRAINT "FK_0cc24456a45577d3018d29f6a1a" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_warehouse_stock"
            ADD CONSTRAINT "FK_7cd4d7329e10a363cff3d4f17c4" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_warehouse_stock"
            ADD CONSTRAINT "FK_423943f4f7357b1f3d6ebfed4b0" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_warehouse_stock"
            ADD CONSTRAINT "FK_8d8501c0040f26c0d9217bd9cdd" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_template_dependency_rule_inputs"
            ADD CONSTRAINT "FK_23de8a318fe477ec964c165e66c" FOREIGN KEY ("rule_id") REFERENCES "bom_template_dependency_rules"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_template_dependency_rule_inputs"
            ADD CONSTRAINT "FK_59a7f8d16f1955b0cb395d178ee" FOREIGN KEY ("source_item_id") REFERENCES "bom_subsystem_template_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_template_dependency_rule_inputs"
            ADD CONSTRAINT "FK_3cb74121c95a57fb6141b0763d3" FOREIGN KEY ("source_rule_id") REFERENCES "bom_template_dependency_rules"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_template_dependency_rule_conditions"
            ADD CONSTRAINT "FK_df357ce2d4ae47106278eda6fe8" FOREIGN KEY ("rule_id") REFERENCES "bom_template_dependency_rules"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_template_dependency_rules"
            ADD CONSTRAINT "FK_df76571ffe7fba03e500889b3aa" FOREIGN KEY ("template_id") REFERENCES "bom_subsystem_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_template_dependency_rules"
            ADD CONSTRAINT "FK_ca0323ff064aeebb03278d95a2f" FOREIGN KEY ("target_item_id") REFERENCES "bom_subsystem_template_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "document_templates"
            ADD CONSTRAINT "FK_5b100ce8fe2530a13fc4ba5e48c" FOREIGN KEY ("task_type_id") REFERENCES "task_types"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "documents"
            ADD CONSTRAINT "FK_6bcbbfcb9e55fdcae62dfe968da" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "documents"
            ADD CONSTRAINT "FK_de6af633421b4253e36b492917b" FOREIGN KEY ("generated_from_template_id") REFERENCES "document_templates"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "documents"
            ADD CONSTRAINT "FK_14371caaff44d0801b59b284166" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "material_imports"
            ADD CONSTRAINT "FK_6c65b4f99f9fbcc9cc1f85aa44a" FOREIGN KEY ("imported_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "service_task_activities"
            ADD CONSTRAINT "FK_e540d38df28ef05f4897a15a518" FOREIGN KEY ("service_task_id") REFERENCES "service_tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "service_task_activities"
            ADD CONSTRAINT "FK_5d0603337f53e75037d12498f43" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "user_preferences"
            ADD CONSTRAINT "FK_458057fa75b66e68a275647da2e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "push_subscriptions"
            ADD CONSTRAINT "FK_6771f119f1c06d2ccf38f238664" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "user_sessions_log"
            ADD CONSTRAINT "FK_0df2c56d73d27fbecdda13dd058" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "recorder_specifications"
            ADD CONSTRAINT "FK_2cb386ced87cd2506b6b3aecd24" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "recorder_specifications"
            ADD CONSTRAINT "FK_fa1db86ce5a9ef33dc10e4caf61" FOREIGN KEY ("extension_warehouse_stock_id") REFERENCES "warehouse_stock"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "disk_specifications"
            ADD CONSTRAINT "FK_496168bf8baff365ac1d590fd97" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "slican_central_specifications"
            ADD CONSTRAINT "FK_351bc5c71c43010fc6274dcd652" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "slican_license_specifications"
            ADD CONSTRAINT "FK_b798ade1c76058b51ec998ed3dc" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "wizard_drafts"
            ADD CONSTRAINT "FK_3320e80774cbc86ccaf77ed3ecf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_relationships"
            ADD CONSTRAINT "FK_31235db534dafa9913fce8e2f1f" FOREIGN KEY ("subsystem_id") REFERENCES "subsystems"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_relationships"
            ADD CONSTRAINT "FK_6bbf47b0744dee05f41fbc96f2b" FOREIGN KEY ("parent_task_id") REFERENCES "subsystem_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "task_relationships"
            ADD CONSTRAINT "FK_db1aa678e91044b24e28939bef7" FOREIGN KEY ("child_task_id") REFERENCES "subsystem_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "network_topologies"
            ADD CONSTRAINT "FK_b7920b6e4778227bcad62a72a9a" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "railway_stations"
            ADD CONSTRAINT "FK_afeeacf6b2931e1baae4d034e41" FOREIGN KEY ("line_id") REFERENCES "railway_lines"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_field_definitions"
            ADD CONSTRAINT "FK_a86981d684c609379f97488b6ea" FOREIGN KEY ("template_version_id") REFERENCES "form_template_versions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_field_definitions"
            ADD CONSTRAINT "FK_4470d6039fc4af02b57e1625941" FOREIGN KEY ("section_id", "template_version_id") REFERENCES "form_sections"("id", "template_version_id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_sections"
            ADD CONSTRAINT "FK_f84800b9d249938cd616d0450bf" FOREIGN KEY ("template_version_id") REFERENCES "form_template_versions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_assignment_rules"
            ADD CONSTRAINT "FK_33f02af4f3b6763280e18297c3b" FOREIGN KEY ("template_version_id") REFERENCES "form_template_versions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_assignment_rules"
            ADD CONSTRAINT "FK_12d214a9645d472bf5e2f2b92b8" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_assignment_rules"
            ADD CONSTRAINT "FK_e838ff2a21aa1453c0042a2d1fa" FOREIGN KEY ("assigned_team_id") REFERENCES "brigades"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_assignment_rules"
            ADD CONSTRAINT "fk_form_assignment_trigger" FOREIGN KEY ("trigger_id", "template_version_id") REFERENCES "form_triggers"("id", "template_version_id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_triggers"
            ADD CONSTRAINT "FK_5c4e707625b27622414e3f53ddb" FOREIGN KEY ("template_version_id") REFERENCES "form_template_versions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_field_values"
            ADD CONSTRAINT "FK_3b076521c6b2504265640d9b393" FOREIGN KEY ("instance_id", "template_version_id") REFERENCES "form_instances"("id", "template_version_id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_field_values"
            ADD CONSTRAINT "FK_c6fc82d3cafc32b5c7455229019" FOREIGN KEY ("field_definition_id", "template_version_id") REFERENCES "form_field_definitions"("id", "template_version_id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_field_values"
            ADD CONSTRAINT "FK_8fa3923ef0c9319144765b38a3d" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_approvals"
            ADD CONSTRAINT "FK_6c3b546363b1d1cb7f09d70fbea" FOREIGN KEY ("instance_id") REFERENCES "form_instances"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_approvals"
            ADD CONSTRAINT "FK_69b54348f596dfd7791f4425158" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances"
            ADD CONSTRAINT "FK_d0062085a559050b6703d581eb5" FOREIGN KEY ("template_version_id") REFERENCES "form_template_versions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances"
            ADD CONSTRAINT "FK_73961a3e6061afad0780d4e339d" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances"
            ADD CONSTRAINT "FK_e049c39b11239d58ac2200c317d" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances"
            ADD CONSTRAINT "FK_b134260c6b3dd51634605a795a1" FOREIGN KEY ("subsystem_task_id") REFERENCES "subsystem_tasks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances"
            ADD CONSTRAINT "FK_03b795e9e6d5ec49593de53b401" FOREIGN KEY ("object_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances"
            ADD CONSTRAINT "FK_00b5b910284f4d55315cc465c23" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances"
            ADD CONSTRAINT "FK_f0bf48c9250f7c387995b44d2d5" FOREIGN KEY ("bom_item_id") REFERENCES "task_generated_bom_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances"
            ADD CONSTRAINT "FK_b59acb33ddff74d520afce9379b" FOREIGN KEY ("workflow_bom_item_id") REFERENCES "workflow_generated_bom_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances"
            ADD CONSTRAINT "FK_547b40246ce3b8e2bb9a2eda856" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances"
            ADD CONSTRAINT "FK_c201097f4569552ec17bb724d8d" FOREIGN KEY ("assigned_team_id") REFERENCES "brigades"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances"
            ADD CONSTRAINT "FK_5ec01910383fb05443c4a102e07" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_template_versions"
            ADD CONSTRAINT "FK_6d41e24adcdcdb6108977847ffd" FOREIGN KEY ("template_id") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_template_versions"
            ADD CONSTRAINT "FK_2640e4145484bdbb5a4f9aeb028" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_templates"
            ADD CONSTRAINT "FK_b1f0d5e9dfe6eed6e93538695cd" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "form_value_documents"
            ADD CONSTRAINT "FK_bfd3bfcdfa15c7642381b38a7c4" FOREIGN KEY ("field_value_id") REFERENCES "form_field_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "form_value_documents"
            ADD CONSTRAINT "FK_ffb28226691bae93fdf8443dde0" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "form_value_photos"
            ADD CONSTRAINT "FK_7582bb66d7b21a24b143f78a905" FOREIGN KEY ("field_value_id") REFERENCES "form_field_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "form_value_photos"
            ADD CONSTRAINT "FK_b49ded22d694a9f5008a8d9b207" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "form_value_photos" DROP CONSTRAINT "FK_b49ded22d694a9f5008a8d9b207"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_value_photos" DROP CONSTRAINT "FK_7582bb66d7b21a24b143f78a905"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_value_documents" DROP CONSTRAINT "FK_ffb28226691bae93fdf8443dde0"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_value_documents" DROP CONSTRAINT "FK_bfd3bfcdfa15c7642381b38a7c4"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_templates" DROP CONSTRAINT "FK_b1f0d5e9dfe6eed6e93538695cd"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_template_versions" DROP CONSTRAINT "FK_2640e4145484bdbb5a4f9aeb028"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_template_versions" DROP CONSTRAINT "FK_6d41e24adcdcdb6108977847ffd"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances" DROP CONSTRAINT "FK_5ec01910383fb05443c4a102e07"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances" DROP CONSTRAINT "FK_c201097f4569552ec17bb724d8d"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances" DROP CONSTRAINT "FK_547b40246ce3b8e2bb9a2eda856"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances" DROP CONSTRAINT "FK_b59acb33ddff74d520afce9379b"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances" DROP CONSTRAINT "FK_f0bf48c9250f7c387995b44d2d5"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances" DROP CONSTRAINT "FK_00b5b910284f4d55315cc465c23"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances" DROP CONSTRAINT "FK_03b795e9e6d5ec49593de53b401"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances" DROP CONSTRAINT "FK_b134260c6b3dd51634605a795a1"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances" DROP CONSTRAINT "FK_e049c39b11239d58ac2200c317d"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances" DROP CONSTRAINT "FK_73961a3e6061afad0780d4e339d"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_instances" DROP CONSTRAINT "FK_d0062085a559050b6703d581eb5"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_approvals" DROP CONSTRAINT "FK_69b54348f596dfd7791f4425158"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_approvals" DROP CONSTRAINT "FK_6c3b546363b1d1cb7f09d70fbea"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_field_values" DROP CONSTRAINT "FK_8fa3923ef0c9319144765b38a3d"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_field_values" DROP CONSTRAINT "FK_c6fc82d3cafc32b5c7455229019"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_field_values" DROP CONSTRAINT "FK_3b076521c6b2504265640d9b393"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_triggers" DROP CONSTRAINT "FK_5c4e707625b27622414e3f53ddb"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_assignment_rules" DROP CONSTRAINT "fk_form_assignment_trigger"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_assignment_rules" DROP CONSTRAINT "FK_e838ff2a21aa1453c0042a2d1fa"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_assignment_rules" DROP CONSTRAINT "FK_12d214a9645d472bf5e2f2b92b8"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_assignment_rules" DROP CONSTRAINT "FK_33f02af4f3b6763280e18297c3b"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_sections" DROP CONSTRAINT "FK_f84800b9d249938cd616d0450bf"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_field_definitions" DROP CONSTRAINT "FK_4470d6039fc4af02b57e1625941"
        `);
        await queryRunner.query(`
            ALTER TABLE "form_field_definitions" DROP CONSTRAINT "FK_a86981d684c609379f97488b6ea"
        `);
        await queryRunner.query(`
            ALTER TABLE "railway_stations" DROP CONSTRAINT "FK_afeeacf6b2931e1baae4d034e41"
        `);
        await queryRunner.query(`
            ALTER TABLE "network_topologies" DROP CONSTRAINT "FK_b7920b6e4778227bcad62a72a9a"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_relationships" DROP CONSTRAINT "FK_db1aa678e91044b24e28939bef7"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_relationships" DROP CONSTRAINT "FK_6bbf47b0744dee05f41fbc96f2b"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_relationships" DROP CONSTRAINT "FK_31235db534dafa9913fce8e2f1f"
        `);
        await queryRunner.query(`
            ALTER TABLE "wizard_drafts" DROP CONSTRAINT "FK_3320e80774cbc86ccaf77ed3ecf"
        `);
        await queryRunner.query(`
            ALTER TABLE "slican_license_specifications" DROP CONSTRAINT "FK_b798ade1c76058b51ec998ed3dc"
        `);
        await queryRunner.query(`
            ALTER TABLE "slican_central_specifications" DROP CONSTRAINT "FK_351bc5c71c43010fc6274dcd652"
        `);
        await queryRunner.query(`
            ALTER TABLE "disk_specifications" DROP CONSTRAINT "FK_496168bf8baff365ac1d590fd97"
        `);
        await queryRunner.query(`
            ALTER TABLE "recorder_specifications" DROP CONSTRAINT "FK_fa1db86ce5a9ef33dc10e4caf61"
        `);
        await queryRunner.query(`
            ALTER TABLE "recorder_specifications" DROP CONSTRAINT "FK_2cb386ced87cd2506b6b3aecd24"
        `);
        await queryRunner.query(`
            ALTER TABLE "user_sessions_log" DROP CONSTRAINT "FK_0df2c56d73d27fbecdda13dd058"
        `);
        await queryRunner.query(`
            ALTER TABLE "push_subscriptions" DROP CONSTRAINT "FK_6771f119f1c06d2ccf38f238664"
        `);
        await queryRunner.query(`
            ALTER TABLE "user_preferences" DROP CONSTRAINT "FK_458057fa75b66e68a275647da2e"
        `);
        await queryRunner.query(`
            ALTER TABLE "service_task_activities" DROP CONSTRAINT "FK_5d0603337f53e75037d12498f43"
        `);
        await queryRunner.query(`
            ALTER TABLE "service_task_activities" DROP CONSTRAINT "FK_e540d38df28ef05f4897a15a518"
        `);
        await queryRunner.query(`
            ALTER TABLE "material_imports" DROP CONSTRAINT "FK_6c65b4f99f9fbcc9cc1f85aa44a"
        `);
        await queryRunner.query(`
            ALTER TABLE "documents" DROP CONSTRAINT "FK_14371caaff44d0801b59b284166"
        `);
        await queryRunner.query(`
            ALTER TABLE "documents" DROP CONSTRAINT "FK_de6af633421b4253e36b492917b"
        `);
        await queryRunner.query(`
            ALTER TABLE "documents" DROP CONSTRAINT "FK_6bcbbfcb9e55fdcae62dfe968da"
        `);
        await queryRunner.query(`
            ALTER TABLE "document_templates" DROP CONSTRAINT "FK_5b100ce8fe2530a13fc4ba5e48c"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_template_dependency_rules" DROP CONSTRAINT "FK_ca0323ff064aeebb03278d95a2f"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_template_dependency_rules" DROP CONSTRAINT "FK_df76571ffe7fba03e500889b3aa"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_template_dependency_rule_conditions" DROP CONSTRAINT "FK_df357ce2d4ae47106278eda6fe8"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_template_dependency_rule_inputs" DROP CONSTRAINT "FK_3cb74121c95a57fb6141b0763d3"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_template_dependency_rule_inputs" DROP CONSTRAINT "FK_59a7f8d16f1955b0cb395d178ee"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_template_dependency_rule_inputs" DROP CONSTRAINT "FK_23de8a318fe477ec964c165e66c"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_warehouse_stock" DROP CONSTRAINT "FK_8d8501c0040f26c0d9217bd9cdd"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_warehouse_stock" DROP CONSTRAINT "FK_423943f4f7357b1f3d6ebfed4b0"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_warehouse_stock" DROP CONSTRAINT "FK_7cd4d7329e10a363cff3d4f17c4"
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_warehouse_stock" DROP CONSTRAINT "FK_0cc24456a45577d3018d29f6a1a"
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_warehouse_stock" DROP CONSTRAINT "FK_9d21e37dcdbc3bdcc3dc36e9ae4"
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_warehouse_stock" DROP CONSTRAINT "FK_c5d1b54be2aabcbe65f01a61d71"
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_workflow_bom_mapping" DROP CONSTRAINT "FK_dea88058943588709ee65e72a0f"
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_workflow_bom_mapping" DROP CONSTRAINT "FK_ebdea29236a265c1a72381a04d1"
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_workflow_bom_mapping" DROP CONSTRAINT "FK_692253eab5114436615b1bc7dca"
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_bom_mapping" DROP CONSTRAINT "FK_dce3b1af1940f58cce665f452fb"
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_bom_mapping" DROP CONSTRAINT "FK_a64e7f3ac4233b16e993054060c"
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_bom_mapping" DROP CONSTRAINT "FK_b131594f7875cac197f22be9467"
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_history" DROP CONSTRAINT "FK_3691673324fc77006d06697d7d8"
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock_history" DROP CONSTRAINT "FK_626899b20f330dca5877f290747"
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_documents" DROP CONSTRAINT "FK_736734656efdcb5d4095cafe121"
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_documents" DROP CONSTRAINT "FK_7a44afd4efa831984103e368c71"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_trigger_logs" DROP CONSTRAINT "FK_f294e385c97e5de7ca0256e642e"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_trigger_logs" DROP CONSTRAINT "FK_7afab2cf47ca8df9127d5955355"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_triggers" DROP CONSTRAINT "FK_72a52faadece3e9c99a97b9189b"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_triggers" DROP CONSTRAINT "FK_26a8411fc20be937c8817495243"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_triggers" DROP CONSTRAINT "FK_bf79a4d53729146f4c87e8928a4"
        `);
        await queryRunner.query(`
            ALTER TABLE "material_import_logs" DROP CONSTRAINT "FK_e52a78c108aa5c6be775a83437b"
        `);
        await queryRunner.query(`
            ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"
        `);
        await queryRunner.query(`
            ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_assignments" DROP CONSTRAINT "FK_69edf4d835d0e50fdad8d155d5f"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_assignments" DROP CONSTRAINT "FK_1673eab025dbc14e188bd4df67c"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_assignments" DROP CONSTRAINT "FK_b389f4488d0a8241c3c98273966"
        `);
        await queryRunner.query(`
            ALTER TABLE "tasks" DROP CONSTRAINT "FK_eab268b2a64d9b7a0779904d2dc"
        `);
        await queryRunner.query(`
            ALTER TABLE "tasks" DROP CONSTRAINT "FK_16d56f58865354ff7c94d2e1e70"
        `);
        await queryRunner.query(`
            ALTER TABLE "tasks" DROP CONSTRAINT "FK_52933a69d496dc3e8f2ff64a58d"
        `);
        await queryRunner.query(`
            ALTER TABLE "tasks" DROP CONSTRAINT "FK_dd35bdb872b9065cd75de70e639"
        `);
        await queryRunner.query(`
            ALTER TABLE "tasks" DROP CONSTRAINT "FK_54fc42a253a8338488ec1f960ad"
        `);
        await queryRunner.query(`
            ALTER TABLE "tasks" DROP CONSTRAINT "FK_ea76a982cfc3dd4bff34daaf036"
        `);
        await queryRunner.query(`
            ALTER TABLE "service_tasks" DROP CONSTRAINT "FK_76725e5686da81288f39e12164e"
        `);
        await queryRunner.query(`
            ALTER TABLE "service_tasks" DROP CONSTRAINT "FK_1f180e71cd4fa47290b62f6db72"
        `);
        await queryRunner.query(`
            ALTER TABLE "service_tasks" DROP CONSTRAINT "FK_2e556e092ae37f222ec28cf94ba"
        `);
        await queryRunner.query(`
            ALTER TABLE "service_tasks" DROP CONSTRAINT "FK_da8959f9387df412b88b3d258a1"
        `);
        await queryRunner.query(`
            ALTER TABLE "brigade_members" DROP CONSTRAINT "FK_49d1774039eaf22828d835f52aa"
        `);
        await queryRunner.query(`
            ALTER TABLE "brigade_members" DROP CONSTRAINT "FK_e76bd91bc769f5720a94073e170"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_metrics" DROP CONSTRAINT "FK_450eca6d979cca9e69ab34a84bc"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_metrics" DROP CONSTRAINT "FK_152cdcd060db8b6d4078be470a5"
        `);
        await queryRunner.query(`
            ALTER TABLE "quality_photos" DROP CONSTRAINT "FK_fbc7838b92807f11120003c28ae"
        `);
        await queryRunner.query(`
            ALTER TABLE "quality_photos" DROP CONSTRAINT "FK_ab7328e76a5ed39873676040c71"
        `);
        await queryRunner.query(`
            ALTER TABLE "quality_photos" DROP CONSTRAINT "FK_b8e2d42e3aaa1c850e437787a8f"
        `);
        await queryRunner.query(`
            ALTER TABLE "quality_photos" DROP CONSTRAINT "FK_00860f829b5db7fca9b70edf3c4"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_activities" DROP CONSTRAINT "FK_167e0fe1bf8fc0edfd1a655dd97"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_activities" DROP CONSTRAINT "FK_a407226e413613a8ea4cf9f48cb"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_activities" DROP CONSTRAINT "FK_6c16dbc1f4693fc90f1a7f87a96"
        `);
        await queryRunner.query(`
            ALTER TABLE "devices" DROP CONSTRAINT "FK_f9ce6fbc31f7ee9a6bd03147eea"
        `);
        await queryRunner.query(`
            ALTER TABLE "devices" DROP CONSTRAINT "FK_4eb995e835dc2031ae8a066b5d2"
        `);
        await queryRunner.query(`
            ALTER TABLE "assets" DROP CONSTRAINT "FK_dccd1dbe2c036b9ab80876466b7"
        `);
        await queryRunner.query(`
            ALTER TABLE "assets" DROP CONSTRAINT "FK_705d21f1e137a31e33a9077acd2"
        `);
        await queryRunner.query(`
            ALTER TABLE "assets" DROP CONSTRAINT "FK_948c0a5c5f0841ea8a16b12dc70"
        `);
        await queryRunner.query(`
            ALTER TABLE "assets" DROP CONSTRAINT "FK_6bddfffa3bb9cf201982f16c890"
        `);
        await queryRunner.query(`
            ALTER TABLE "asset_status_history" DROP CONSTRAINT "FK_5b5eaf8239efb2ad06ad2af00c6"
        `);
        await queryRunner.query(`
            ALTER TABLE "asset_status_history" DROP CONSTRAINT "FK_cc05a184626e741ae37b5924b03"
        `);
        await queryRunner.query(`
            ALTER TABLE "asset_tasks" DROP CONSTRAINT "FK_24b7d400c7c7ad08b1c078e5911"
        `);
        await queryRunner.query(`
            ALTER TABLE "asset_tasks" DROP CONSTRAINT "FK_261497a581eaff068e98c2a5648"
        `);
        await queryRunner.query(`
            ALTER TABLE "contracts" DROP CONSTRAINT "FK_cb7d02b9a4d6b88327a58268ed4"
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystems" DROP CONSTRAINT "FK_7ee012a6c3e940c3c35ea6bb988"
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_tasks" DROP CONSTRAINT "FK_78662dfd1bf1984da54cdef2d20"
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_tasks" DROP CONSTRAINT "FK_4b47de5f07172a9e1e8b6cf8eaf"
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_tasks" DROP CONSTRAINT "FK_b03e4b8f8471bafc8acdfbc56ee"
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_tasks" DROP CONSTRAINT "FK_c0186ec7306c9bd2d4e7c7e051b"
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_tasks" DROP CONSTRAINT "FK_f0c8e18d8dfbc04a09a2bf2d030"
        `);
        await queryRunner.query(`
            ALTER TABLE "subsystem_tasks" DROP CONSTRAINT "FK_3ec22811d2ac8cf047be07b81b9"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_generated_boms" DROP CONSTRAINT "FK_dca2ce0650e18ba9a40b4327c7d"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_generated_boms" DROP CONSTRAINT "FK_3cbf1b67c844bda516cb184bbef"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_generated_boms" DROP CONSTRAINT "FK_52c5a39be2e50a9e293b8980f97"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_generated_bom_items" DROP CONSTRAINT "FK_65683e538824272508c6645000a"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_generated_bom_items" DROP CONSTRAINT "FK_eddc33e01a0b90ddf96c953e88c"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_subsystem_templates" DROP CONSTRAINT "FK_e33f4ebe006aa4f800ff3285c59"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_subsystem_templates" DROP CONSTRAINT "FK_5d98582c3ef943f84c1f69beb51"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_subsystem_template_items" DROP CONSTRAINT "FK_074bbfdba7b7c9d889b5ed51d7b"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_subsystem_template_items" DROP CONSTRAINT "FK_de122761e82019e28cd02b4e44f"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_subsystem_template_items" DROP CONSTRAINT "FK_03f47c752ff37036da7e94b01e8"
        `);
        await queryRunner.query(`
            ALTER TABLE "prefabrication_tasks" DROP CONSTRAINT "FK_0f0e137c624c9ba1534c25352f8"
        `);
        await queryRunner.query(`
            ALTER TABLE "prefabrication_tasks" DROP CONSTRAINT "FK_65e02aa3ffdfc40a93e1641e728"
        `);
        await queryRunner.query(`
            ALTER TABLE "prefabrication_tasks" DROP CONSTRAINT "FK_df826cc67f99cab84a7cfcccfe3"
        `);
        await queryRunner.query(`
            ALTER TABLE "prefabrication_devices" DROP CONSTRAINT "FK_470eb113538cd571f78d07c7ca3"
        `);
        await queryRunner.query(`
            ALTER TABLE "prefabrication_devices" DROP CONSTRAINT "FK_c4e7f1023884b30ff0da5303fd1"
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_orders" DROP CONSTRAINT "FK_f97949f5bf427853167435d2e31"
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_orders" DROP CONSTRAINT "FK_aca1e4f18b0cdad2c73b8308863"
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_orders" DROP CONSTRAINT "FK_1c70ee1262f936268fc7221fc29"
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_orders" DROP CONSTRAINT "FK_43e4b78076810ba9cf40da31172"
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_items" DROP CONSTRAINT "FK_be5582d63869387ec12af032281"
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_items" DROP CONSTRAINT "FK_2b1f98ef513c49c61913b817873"
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_items" DROP CONSTRAINT "FK_caf10393bd5f8809fd1ca532fa7"
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_items" DROP CONSTRAINT "FK_ec2d2a952974e74421d944f2fd0"
        `);
        await queryRunner.query(`
            ALTER TABLE "completion_items" DROP CONSTRAINT "FK_e2e36ac0af735cb275e2d7834f8"
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock" DROP CONSTRAINT "FK_cdd5768cf95a196b6265ee53c73"
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock" DROP CONSTRAINT "FK_da95cada4dec0749aa7e3893f11"
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock" DROP CONSTRAINT "FK_6d7c0691e8b558cc09bfdb53aed"
        `);
        await queryRunner.query(`
            ALTER TABLE "warehouse_stock" DROP CONSTRAINT "FK_bb86d89df5e170f9ef6cefd49db"
        `);
        await queryRunner.query(`
            ALTER TABLE "pallets" DROP CONSTRAINT "FK_ef0d5d27b31865332aa729ccfbe"
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_generated_boms" DROP CONSTRAINT "FK_4a4ec03d2312bc3454b7b41d9cf"
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_generated_boms" DROP CONSTRAINT "FK_895bb917c4ea238f35f1293fafd"
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_generated_bom_items" DROP CONSTRAINT "FK_ca3de2c549b04e0333f23302815"
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_generated_bom_items" DROP CONSTRAINT "FK_d7f2c0fc4ec85457f1683457845"
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_bom_template_items" DROP CONSTRAINT "FK_2b98cbc3a163f04246b71d74452"
        `);
        await queryRunner.query(`
            ALTER TABLE "network_allocations" DROP CONSTRAINT "FK_a4b44dfb15187232067ce5f882e"
        `);
        await queryRunner.query(`
            ALTER TABLE "network_allocations" DROP CONSTRAINT "FK_0ba2c63b6e78d122ba7b97925e9"
        `);
        await queryRunner.query(`
            ALTER TABLE "network_allocations" DROP CONSTRAINT "FK_bfe2f64b3fa5ef1c306b36fca33"
        `);
        await queryRunner.query(`
            ALTER TABLE "device_ip_assignments" DROP CONSTRAINT "FK_af1f6c37bec30d65928782c5109"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_materials" DROP CONSTRAINT "FK_e5dc641062ece8c4fb3671b005c"
        `);
        await queryRunner.query(`
            ALTER TABLE "task_materials" DROP CONSTRAINT "FK_8d0de7665ca44911c0e2226b1c3"
        `);
        await queryRunner.query(`
            ALTER TABLE "activity_templates" DROP CONSTRAINT "FK_f5d86034ce333c6b6a07d9d9817"
        `);
        await queryRunner.query(`
            ALTER TABLE "activity_templates" DROP CONSTRAINT "FK_8c269ec20b25fd395ab386e85b8"
        `);
        await queryRunner.query(`
            ALTER TABLE "ip_pools" DROP CONSTRAINT "FK_adde2534e9e3080c3ba0c292188"
        `);
        await queryRunner.query(`
            ALTER TABLE "bom_templates" DROP CONSTRAINT "FK_255b1ea387e0195c8271281f859"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_b49ded22d694a9f5008a8d9b20"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_7582bb66d7b21a24b143f78a90"
        `);
        await queryRunner.query(`
            DROP TABLE "form_value_photos"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ffb28226691bae93fdf8443dde"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_bfd3bfcdfa15c7642381b38a7c"
        `);
        await queryRunner.query(`
            DROP TABLE "form_value_documents"
        `);
        await queryRunner.query(`
            DROP TABLE "form_templates"
        `);
        await queryRunner.query(`
            DROP TABLE "form_template_versions"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_instances_version"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_instances_contract"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_instances_task"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_instances_subsystem_task"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_instances_object"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_instances_device"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_instances_bom_item"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_instances_workflow_bom_item"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_instances_user_status"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_instances_team_status"
        `);
        await queryRunner.query(`
            DROP TABLE "form_instances"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_approvals_stage"
        `);
        await queryRunner.query(`
            DROP TABLE "form_approvals"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_values_field"
        `);
        await queryRunner.query(`
            DROP TABLE "form_field_values"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_triggers_version"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_triggers_event"
        `);
        await queryRunner.query(`
            DROP TABLE "form_triggers"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_assignment_rules_version"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_assignment_rules_trigger"
        `);
        await queryRunner.query(`
            DROP TABLE "form_assignment_rules"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_sections_order"
        `);
        await queryRunner.query(`
            DROP TABLE "form_sections"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_form_fields_order"
        `);
        await queryRunner.query(`
            DROP TABLE "form_field_definitions"
        `);
        await queryRunner.query(`
            DROP TABLE "email_automation_audit_log"
        `);
        await queryRunner.query(`
            DROP TABLE "webhook_configs"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3d6183a8a8a3c1aa1af1ccfb2d"
        `);
        await queryRunner.query(`
            DROP TABLE "railway_lines"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_35317362f8b3e3a1d97418c55c"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2db1b14ff0ade598ca84a8068a"
        `);
        await queryRunner.query(`
            DROP TABLE "railway_stations"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_f93ad3648a71aca8ef7487a998"
        `);
        await queryRunner.query(`
            DROP TABLE "network_topologies"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_31235db534dafa9913fce8e2f1"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6bbf47b0744dee05f41fbc96f2"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_db1aa678e91044b24e28939bef"
        `);
        await queryRunner.query(`
            DROP TABLE "task_relationships"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6af7c881c162686ca5f3ac7bd1"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d17ccf7628ddc87c4c6588a30c"
        `);
        await queryRunner.query(`
            DROP TABLE "wizard_drafts"
        `);
        await queryRunner.query(`
            DROP TABLE "slican_voip_subscriber_formula"
        `);
        await queryRunner.query(`
            DROP TABLE "slican_license_specifications"
        `);
        await queryRunner.query(`
            DROP TABLE "slican_central_specifications"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_496168bf8baff365ac1d590fd9"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d6c6d372b82c788932d1c37ee8"
        `);
        await queryRunner.query(`
            DROP TABLE "disk_specifications"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2cb386ced87cd2506b6b3aecd2"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_29ffc5894ee429ef5f1f862827"
        `);
        await queryRunner.query(`
            DROP TABLE "recorder_specifications"
        `);
        await queryRunner.query(`
            DROP TABLE "cars"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_0df2c56d73d27fbecdda13dd05"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_8a6f940a459bb999f52c4f2c0e"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_64ff6dfcc4d8a782510322bb32"
        `);
        await queryRunner.query(`
            DROP TABLE "user_sessions_log"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d7bbd4532bb7e14cd1001d81ec"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3eed99bfe27cbd55964c89f3b8"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1746fca13e090a36768ac1c554"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_9807238b77dbe48d7bec27286f"
        `);
        await queryRunner.query(`
            DROP TABLE "honeypot_logs"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."threat_level_enum"
        `);
        await queryRunner.query(`
            DROP TABLE "photo_albums"
        `);
        await queryRunner.query(`
            DROP TABLE "photos"
        `);
        await queryRunner.query(`
            DROP TABLE "push_subscriptions"
        `);
        await queryRunner.query(`
            DROP TABLE "user_preferences"
        `);
        await queryRunner.query(`
            DROP TABLE "service_task_activities"
        `);
        await queryRunner.query(`
            DROP TABLE "notifications"
        `);
        await queryRunner.query(`
            DROP TABLE "notification_schedules"
        `);
        await queryRunner.query(`
            DROP TABLE "system_config"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2746ab557f8ebdc82bfca6e855"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6c65b4f99f9fbcc9cc1f85aa44"
        `);
        await queryRunner.query(`
            DROP TABLE "material_imports"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6bcbbfcb9e55fdcae62dfe968d"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_b20c1ae2c7098e9a822f15aa6f"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_14371caaff44d0801b59b28416"
        `);
        await queryRunner.query(`
            DROP TABLE "documents"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_5b100ce8fe2530a13fc4ba5e48"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_f0b4425b1e88cb039de6b68f11"
        `);
        await queryRunner.query(`
            DROP TABLE "document_templates"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_df76571ffe7fba03e500889b3a"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ca0323ff064aeebb03278d95a2"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e3c612bc0a7c25c1bba6d18974"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_7a67253f353b62bf192158159a"
        `);
        await queryRunner.query(`
            DROP TABLE "bom_template_dependency_rules"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_df357ce2d4ae47106278eda6fe"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_7c1ab69a7a5c9c426dc72de756"
        `);
        await queryRunner.query(`
            DROP TABLE "bom_template_dependency_rule_conditions"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_23de8a318fe477ec964c165e66"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_59a7f8d16f1955b0cb395d178e"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3cb74121c95a57fb6141b0763d"
        `);
        await queryRunner.query(`
            DROP TABLE "bom_template_dependency_rule_inputs"
        `);
        await queryRunner.query(`
            DROP TABLE "bom_dependency_rules"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_b857fad26f6ec489f40c8c4c83"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a149390d3907c6fdde72dea3bf"
        `);
        await queryRunner.query(`
            DROP TABLE "bom_groups"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_7520950074cd1818fd507601a1"
        `);
        await queryRunner.query(`
            DROP TABLE "warehouse_locations"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a605ac1aa32c57f507c39483f5"
        `);
        await queryRunner.query(`
            DROP TABLE "task_warehouse_stock"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_9fc0756fc28cb7cdf0d09ed74e"
        `);
        await queryRunner.query(`
            DROP TABLE "subsystem_warehouse_stock"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1de60d1b0633a80337312e677c"
        `);
        await queryRunner.query(`
            DROP TABLE "warehouse_stock_workflow_bom_mapping"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_c3d238d3e4f110205ef0a213fe"
        `);
        await queryRunner.query(`
            DROP TABLE "warehouse_stock_bom_mapping"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_626899b20f330dca5877f29074"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_154439e62eb0e2683c664e821d"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_9613308a9bc8eea78abad92de6"
        `);
        await queryRunner.query(`
            DROP TABLE "warehouse_stock_history"
        `);
        await queryRunner.query(`
            DROP TABLE "subsystem_documents"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_7afab2cf47ca8df9127d595535"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_f294e385c97e5de7ca0256e642"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ea77e5385633231a3e106ac3cb"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_8591f58eb666f4c82085715ba3"
        `);
        await queryRunner.query(`
            DROP TABLE "bom_trigger_logs"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4197d0baf6bc96b6dd6a50f73f"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4665fd302a2f4f962c2f081709"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_533838e9fc167c7a44d84c2b49"
        `);
        await queryRunner.query(`
            DROP TABLE "bom_triggers"
        `);
        await queryRunner.query(`
            DROP TABLE "material_import_logs"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."material_import_logs_status_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1196f6be70269dec1694107f7d"
        `);
        await queryRunner.query(`
            DROP TABLE "material_stocks"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."material_stocks_source_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_b4bffc4033b7bd52e241210710"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_b85ba602ae65eb5813f09e3cec"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ba3bd69c8ad1e799c0256e9e50"
        `);
        await queryRunner.query(`
            DROP TABLE "refresh_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2f1f822596c4af9491d12ff0cb"
        `);
        await queryRunner.query(`
            DROP TABLE "task_assignments"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ae394f93fcb0a172c55ee28339"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6086c8dafbae729a930c04d865"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ea76a982cfc3dd4bff34daaf03"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_dd35bdb872b9065cd75de70e63"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_52933a69d496dc3e8f2ff64a58"
        `);
        await queryRunner.query(`
            DROP TABLE "tasks"
        `);
        await queryRunner.query(`
            DROP TABLE "brigades"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_8434911c69134ae9c2a4920695"
        `);
        await queryRunner.query(`
            DROP TABLE "service_tasks"
        `);
        await queryRunner.query(`
            DROP TABLE "brigade_members"
        `);
        await queryRunner.query(`
            DROP TABLE "task_metrics"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_c5faa2b75487517753cf0f250f"
        `);
        await queryRunner.query(`
            DROP TABLE "quality_photos"
        `);
        await queryRunner.query(`
            DROP TABLE "task_activities"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_cc9e89897e336172fd06367735"
        `);
        await queryRunner.query(`
            DROP TABLE "devices"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_02fbdb95200fc41c39c7818f58"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_eaa6c65fe7cf634aa3d80f317d"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_06be3e2fd34f70a8e68e518dbf"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6bddfffa3bb9cf201982f16c89"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_948c0a5c5f0841ea8a16b12dc7"
        `);
        await queryRunner.query(`
            DROP TABLE "assets"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_cc05a184626e741ae37b5924b0"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_f7f1a1d27204d5357ec28a2614"
        `);
        await queryRunner.query(`
            DROP TABLE "asset_status_history"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_261497a581eaff068e98c2a564"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_24b7d400c7c7ad08b1c078e591"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4842cb6f7e01b8ce0aa37356e1"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_508ff6474d1bd69094f2546e0f"
        `);
        await queryRunner.query(`
            DROP TABLE "asset_tasks"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_db84c172dc74e6271e614b68fb"
        `);
        await queryRunner.query(`
            DROP TABLE "contracts"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_de476c4474b263ff9e937162c4"
        `);
        await queryRunner.query(`
            DROP TABLE "subsystems"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_0f145c7ac1d84a432323ed2969"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3ec22811d2ac8cf047be07b81b"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e9edcb788ee65f79f2108b73ec"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4e62c9f998d5d0e856266441a6"
        `);
        await queryRunner.query(`
            DROP TABLE "subsystem_tasks"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e4461e882745197163063af3a0"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_52c5a39be2e50a9e293b8980f9"
        `);
        await queryRunner.query(`
            DROP TABLE "task_generated_boms"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_eddc33e01a0b90ddf96c953e88"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_655819435ab7fc3913c483ebea"
        `);
        await queryRunner.query(`
            DROP TABLE "task_generated_bom_items"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1be767176b40b4cdde2aa82cbb"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_f482b4b9bd5a3898e5951d2785"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_5dc07eed3a07ba9d9875ec8420"
        `);
        await queryRunner.query(`
            DROP TABLE "bom_subsystem_templates"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_03f47c752ff37036da7e94b01e"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_de122761e82019e28cd02b4e44"
        `);
        await queryRunner.query(`
            DROP TABLE "bom_subsystem_template_items"
        `);
        await queryRunner.query(`
            DROP TABLE "prefabrication_tasks"
        `);
        await queryRunner.query(`
            DROP TABLE "prefabrication_devices"
        `);
        await queryRunner.query(`
            DROP TABLE "completion_orders"
        `);
        await queryRunner.query(`
            DROP TABLE "completion_items"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_763cf7eb93aa5311bba7cb5466"
        `);
        await queryRunner.query(`
            DROP TABLE "warehouse_stock"
        `);
        await queryRunner.query(`
            DELETE FROM "typeorm_metadata"
            WHERE "type" = $1
                AND "name" = $2
                AND "database" = $3
                AND "schema" = $4
                AND "table" = $5
        `, ["GENERATED_COLUMN","quantity_available","postgres","public","warehouse_stock"]);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a8eb3abbaa4566cc1f1cc7818e"
        `);
        await queryRunner.query(`
            DROP TABLE "pallets"
        `);
        await queryRunner.query(`
            DROP TABLE "workflow_generated_boms"
        `);
        await queryRunner.query(`
            DROP TABLE "workflow_generated_bom_items"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3245e00318abdd04515c5f08e0"
        `);
        await queryRunner.query(`
            DROP TABLE "workflow_bom_templates"
        `);
        await queryRunner.query(`
            DROP TABLE "workflow_bom_template_items"
        `);
        await queryRunner.query(`
            DROP TABLE "network_allocations"
        `);
        await queryRunner.query(`
            DROP TABLE "device_ip_assignments"
        `);
        await queryRunner.query(`
            DROP TABLE "network_pools"
        `);
        await queryRunner.query(`
            DROP TABLE "task_materials"
        `);
        await queryRunner.query(`
            DROP TABLE "task_types"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_21d6caac646c8e913208fe1150"
        `);
        await queryRunner.query(`
            DROP TABLE "activity_templates"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_37ced09484662b934c48473994"
        `);
        await queryRunner.query(`
            DROP TABLE "ip_pools"
        `);
        await queryRunner.query(`
            DROP TABLE "bom_templates"
        `);
        await queryRunner.query(`
            DROP TABLE "roles"
        `);
    }

}
