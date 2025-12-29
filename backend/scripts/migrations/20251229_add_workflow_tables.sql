-- scripts/migrations/20251229_add_workflow_tables.sql
-- Migracja: Dodanie tabel dla workflow kontraktowego

-- ============================================
-- Tabele kontraktów i podsystemów
-- ============================================

CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  contract_number VARCHAR(20) UNIQUE NOT NULL,
  custom_name VARCHAR(200) NOT NULL,
  order_date DATE NOT NULL,
  manager_code VARCHAR(3) NOT NULL,
  jowisz_ref VARCHAR(100),
  project_manager_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'CREATED' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contracts_number ON contracts(contract_number);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_manager ON contracts(project_manager_id);

COMMENT ON TABLE contracts IS 'Kontrakty Der-Mag';
COMMENT ON COLUMN contracts.contract_number IS 'Numer kontraktu w formacie RXXXXXXX_Y';

-- ---

CREATE TABLE IF NOT EXISTS subsystems (
  id SERIAL PRIMARY KEY,
  subsystem_number VARCHAR(11) UNIQUE NOT NULL,
  system_type VARCHAR(50) NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'CREATED' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subsystems_number ON subsystems(subsystem_number);
CREATE INDEX idx_subsystems_contract ON subsystems(contract_id);
CREATE INDEX idx_subsystems_type ON subsystems(system_type);

COMMENT ON TABLE subsystems IS 'Podsystemy w kontraktach';
COMMENT ON COLUMN subsystems.subsystem_number IS 'Numer podsystemu w formacie PXXXXXYYZZ';

-- ============================================
-- Tabele zarządzania siecią IP
-- ============================================

CREATE TABLE IF NOT EXISTS network_pools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  cidr_range VARCHAR(20) NOT NULL,
  priority INTEGER DEFAULT 1 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_network_pools_priority ON network_pools(priority);

COMMENT ON TABLE network_pools IS 'Pule adresów IP';

-- ---

CREATE TABLE IF NOT EXISTS network_allocations (
  id SERIAL PRIMARY KEY,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  subsystem_id INTEGER NOT NULL REFERENCES subsystems(id) ON DELETE CASCADE,
  pool_id INTEGER NOT NULL REFERENCES network_pools(id),
  system_type VARCHAR(50) NOT NULL,
  allocated_range VARCHAR(20) NOT NULL,
  gateway INET NOT NULL,
  subnet_mask INET NOT NULL,
  ntp_server INET NOT NULL,
  first_usable_ip INET NOT NULL,
  last_usable_ip INET NOT NULL,
  total_hosts INTEGER NOT NULL,
  used_hosts INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_network_allocations_subsystem ON network_allocations(subsystem_id);
CREATE INDEX idx_network_allocations_contract ON network_allocations(contract_id);
CREATE INDEX idx_network_allocations_pool ON network_allocations(pool_id);

COMMENT ON TABLE network_allocations IS 'Alokacje sieci dla podsystemów';

-- ---

CREATE TABLE IF NOT EXISTS device_ip_assignments (
  id SERIAL PRIMARY KEY,
  allocation_id INTEGER NOT NULL REFERENCES network_allocations(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  serial_number VARCHAR(100),
  device_category VARCHAR(20) NOT NULL,
  device_type VARCHAR(100) NOT NULL,
  hostname VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'PLANNED' NOT NULL,
  configured_by INTEGER REFERENCES users(id),
  configured_at TIMESTAMP,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  firmware_version VARCHAR(50),
  test_results JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_device_ip_allocation ON device_ip_assignments(allocation_id);
CREATE INDEX idx_device_ip_address ON device_ip_assignments(ip_address);
CREATE INDEX idx_device_category ON device_ip_assignments(device_category);

COMMENT ON TABLE device_ip_assignments IS 'Przypisania IP do urządzeń';

-- ============================================
-- Tabele BOM workflow
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_bom_templates (
  id SERIAL PRIMARY KEY,
  template_code VARCHAR(50) UNIQUE NOT NULL,
  system_type VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wbom_template_code ON workflow_bom_templates(template_code);
CREATE INDEX idx_wbom_system_type ON workflow_bom_templates(system_type);

COMMENT ON TABLE workflow_bom_templates IS 'Szablony BOM dla workflow';

-- ---

CREATE TABLE IF NOT EXISTS workflow_bom_template_items (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES workflow_bom_templates(id) ON DELETE CASCADE,
  part_number VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL,
  unit VARCHAR(20) DEFAULT 'szt' NOT NULL,
  is_network_device BOOLEAN DEFAULT FALSE NOT NULL,
  network_category VARCHAR(20),
  requires_serial_number BOOLEAN DEFAULT FALSE NOT NULL,
  requires_ip_address BOOLEAN DEFAULT FALSE NOT NULL,
  estimated_price DECIMAL(10,2),
  supplier VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wbom_items_template ON workflow_bom_template_items(template_id);

COMMENT ON TABLE workflow_bom_template_items IS 'Pozycje w szablonach BOM workflow';

-- ---

CREATE TABLE IF NOT EXISTS workflow_generated_boms (
  id SERIAL PRIMARY KEY,
  subsystem_id INTEGER NOT NULL REFERENCES subsystems(id) ON DELETE CASCADE,
  template_id INTEGER NOT NULL REFERENCES workflow_bom_templates(id),
  status VARCHAR(30) DEFAULT 'GENERATED' NOT NULL,
  generated_by INTEGER NOT NULL REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wgen_bom_subsystem ON workflow_generated_boms(subsystem_id);
CREATE INDEX idx_wgen_bom_status ON workflow_generated_boms(status);

COMMENT ON TABLE workflow_generated_boms IS 'Wygenerowane BOM dla podsystemów';

-- ---

CREATE TABLE IF NOT EXISTS workflow_generated_bom_items (
  id SERIAL PRIMARY KEY,
  generated_bom_id INTEGER NOT NULL REFERENCES workflow_generated_boms(id) ON DELETE CASCADE,
  template_item_id INTEGER NOT NULL REFERENCES workflow_bom_template_items(id),
  quantity INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
  scanned_quantity INTEGER DEFAULT 0 NOT NULL,
  missing_quantity INTEGER DEFAULT 0 NOT NULL
);

CREATE INDEX idx_wgen_bom_items_bom ON workflow_generated_bom_items(generated_bom_id);

COMMENT ON TABLE workflow_generated_bom_items IS 'Pozycje w wygenerowanych BOM';

-- ============================================
-- Tabele kompletacji
-- ============================================

CREATE TABLE IF NOT EXISTS completion_orders (
  id SERIAL PRIMARY KEY,
  subsystem_id INTEGER NOT NULL REFERENCES subsystems(id) ON DELETE CASCADE,
  generated_bom_id INTEGER NOT NULL REFERENCES workflow_generated_boms(id),
  assigned_to INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(30) DEFAULT 'CREATED' NOT NULL,
  decision VARCHAR(30),
  decision_notes TEXT,
  decision_by INTEGER REFERENCES users(id),
  decision_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_completion_orders_subsystem ON completion_orders(subsystem_id);
CREATE INDEX idx_completion_orders_status ON completion_orders(status);
CREATE INDEX idx_completion_orders_assigned ON completion_orders(assigned_to);

COMMENT ON TABLE completion_orders IS 'Zlecenia kompletacji';

-- ---

CREATE TABLE IF NOT EXISTS pallets (
  id SERIAL PRIMARY KEY,
  pallet_number VARCHAR(20) UNIQUE NOT NULL,
  completion_order_id INTEGER NOT NULL REFERENCES completion_orders(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'OPEN' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);

CREATE INDEX idx_pallets_number ON pallets(pallet_number);
CREATE INDEX idx_pallets_order ON pallets(completion_order_id);

COMMENT ON TABLE pallets IS 'Palety kompletacji';

-- ---

CREATE TABLE IF NOT EXISTS completion_items (
  id SERIAL PRIMARY KEY,
  completion_order_id INTEGER NOT NULL REFERENCES completion_orders(id) ON DELETE CASCADE,
  bom_item_id INTEGER NOT NULL REFERENCES workflow_generated_bom_items(id),
  status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
  scanned_barcode VARCHAR(200),
  serial_number VARCHAR(100),
  pallet_id INTEGER REFERENCES pallets(id),
  scanned_quantity INTEGER DEFAULT 0 NOT NULL,
  scanned_by INTEGER REFERENCES users(id),
  scanned_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_completion_items_order ON completion_items(completion_order_id);
CREATE INDEX idx_completion_items_pallet ON completion_items(pallet_id);

COMMENT ON TABLE completion_items IS 'Pozycje kompletacji';

-- ============================================
-- Tabele prefabrykacji
-- ============================================

CREATE TABLE IF NOT EXISTS prefabrication_tasks (
  id SERIAL PRIMARY KEY,
  completion_order_id INTEGER NOT NULL REFERENCES completion_orders(id) ON DELETE CASCADE,
  subsystem_id INTEGER NOT NULL REFERENCES subsystems(id) ON DELETE CASCADE,
  assigned_to INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'CREATED' NOT NULL,
  ip_matrix_received BOOLEAN DEFAULT FALSE NOT NULL,
  materials_received BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_prefab_tasks_subsystem ON prefabrication_tasks(subsystem_id);
CREATE INDEX idx_prefab_tasks_assigned ON prefabrication_tasks(assigned_to);
CREATE INDEX idx_prefab_tasks_status ON prefabrication_tasks(status);

COMMENT ON TABLE prefabrication_tasks IS 'Zadania prefabrykacji';

-- ---

CREATE TABLE IF NOT EXISTS prefabrication_devices (
  id SERIAL PRIMARY KEY,
  prefab_task_id INTEGER NOT NULL REFERENCES prefabrication_tasks(id) ON DELETE CASCADE,
  ip_assignment_id INTEGER NOT NULL REFERENCES device_ip_assignments(id),
  status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
  configured_at TIMESTAMP,
  verified_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_prefab_devices_task ON prefabrication_devices(prefab_task_id);
CREATE INDEX idx_prefab_devices_ip ON prefabrication_devices(ip_assignment_id);

COMMENT ON TABLE prefabrication_devices IS 'Urządzenia w prefabrykacji';

-- ============================================
-- Triggery dla updated_at
-- ============================================

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_ip_updated_at
  BEFORE UPDATE ON device_ip_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wbom_templates_updated_at
  BEFORE UPDATE ON workflow_bom_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
