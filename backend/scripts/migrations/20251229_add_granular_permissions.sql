-- scripts/migrations/20251229_add_granular_permissions.sql
-- Migracja: Dodanie granularnych uprawnień do systemu ról

-- Zaktualizuj uprawnienia dla roli Admin (pełny dostęp)
UPDATE roles 
SET permissions = jsonb_build_object(
  'all', true
)
WHERE name = 'admin';

-- Zaktualizuj uprawnienia dla roli Manager
UPDATE roles 
SET permissions = jsonb_build_object(
  'contracts', jsonb_build_object(
    'read', true,
    'create', true,
    'update', true,
    'delete', true,
    'approve', true,
    'import', true
  ),
  'subsystems', jsonb_build_object(
    'read', true,
    'create', true,
    'update', true,
    'delete', true,
    'generateBom', true,
    'allocateNetwork', true
  ),
  'network', jsonb_build_object(
    'read', true,
    'viewMatrix', true
  ),
  'completion', jsonb_build_object(
    'read', true,
    'decideContinue', true
  ),
  'prefabrication', jsonb_build_object(
    'read', true
  ),
  'notifications', jsonb_build_object(
    'receiveAlerts', true,
    'sendManual', true,
    'configureTriggers', true
  )
)
WHERE name = 'manager';

-- Zaktualizuj uprawnienia dla roli BOM Editor
UPDATE roles 
SET permissions = jsonb_build_object(
  'subsystems', jsonb_build_object(
    'read', true,
    'generateBom', true,
    'allocateNetwork', true
  ),
  'network', jsonb_build_object(
    'read', true,
    'allocate', true,
    'viewMatrix', true
  ),
  'notifications', jsonb_build_object(
    'receiveAlerts', true
  )
)
WHERE name = 'bom_editor';

-- Zaktualizuj uprawnienia dla roli Coordinator (tylko SERWIS + read)
UPDATE roles 
SET permissions = jsonb_build_object(
  'contracts', jsonb_build_object(
    'read', true
  ),
  'subsystems', jsonb_build_object(
    'read', true
  ),
  'network', jsonb_build_object(
    'read', true,
    'viewMatrix', true
  ),
  'completion', jsonb_build_object(
    'read', true
  ),
  'prefabrication', jsonb_build_object(
    'read', true
  ),
  'notifications', jsonb_build_object(
    'receiveAlerts', true
  )
)
WHERE name = 'coordinator';

-- Zaktualizuj uprawnienia dla roli Prefabricator
UPDATE roles 
SET permissions = jsonb_build_object(
  'prefabrication', jsonb_build_object(
    'read', true,
    'receiveOrder', true,
    'configure', true,
    'verify', true,
    'assignSerial', true,
    'complete', true
  ),
  'network', jsonb_build_object(
    'read', true,
    'viewMatrix', true
  ),
  'notifications', jsonb_build_object(
    'receiveAlerts', true
  )
)
WHERE name = 'prefabricator';

-- Zaktualizuj uprawnienia dla roli Worker (kompletacja)
UPDATE roles 
SET permissions = jsonb_build_object(
  'completion', jsonb_build_object(
    'read', true,
    'scan', true,
    'assignPallet', true,
    'reportMissing', true,
    'complete', true
  ),
  'notifications', jsonb_build_object(
    'receiveAlerts', true
  )
)
WHERE name = 'worker';

-- Utworzenie ról jeśli nie istnieją
DO $$
BEGIN
  -- Admin
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin') THEN
    INSERT INTO roles (name, description, permissions)
    VALUES ('admin', 'Administrator systemu - pełny dostęp', jsonb_build_object('all', true));
  END IF;

  -- Manager
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'manager') THEN
    INSERT INTO roles (name, description, permissions)
    VALUES ('manager', 'Kierownik projektu - zarządzanie kontraktami i decyzje', 
      jsonb_build_object(
        'contracts', jsonb_build_object('read', true, 'create', true, 'update', true, 'delete', true, 'approve', true, 'import', true),
        'subsystems', jsonb_build_object('read', true, 'create', true, 'update', true, 'delete', true, 'generateBom', true, 'allocateNetwork', true),
        'network', jsonb_build_object('read', true, 'viewMatrix', true),
        'completion', jsonb_build_object('read', true, 'decideContinue', true),
        'prefabrication', jsonb_build_object('read', true),
        'notifications', jsonb_build_object('receiveAlerts', true, 'sendManual', true, 'configureTriggers', true)
      )
    );
  END IF;

  -- BOM Editor
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'bom_editor') THEN
    INSERT INTO roles (name, description, permissions)
    VALUES ('bom_editor', 'Edytor BOM - zarządzanie materiałami i alokacja sieci', 
      jsonb_build_object(
        'subsystems', jsonb_build_object('read', true, 'generateBom', true, 'allocateNetwork', true),
        'network', jsonb_build_object('read', true, 'allocate', true, 'viewMatrix', true),
        'notifications', jsonb_build_object('receiveAlerts', true)
      )
    );
  END IF;

  -- Coordinator
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'coordinator') THEN
    INSERT INTO roles (name, description, permissions)
    VALUES ('coordinator', 'Koordynator - dostęp tylko do odczytu i serwisu', 
      jsonb_build_object(
        'contracts', jsonb_build_object('read', true),
        'subsystems', jsonb_build_object('read', true),
        'network', jsonb_build_object('read', true, 'viewMatrix', true),
        'completion', jsonb_build_object('read', true),
        'prefabrication', jsonb_build_object('read', true),
        'notifications', jsonb_build_object('receiveAlerts', true)
      )
    );
  END IF;

  -- Prefabricator
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'prefabricator') THEN
    INSERT INTO roles (name, description, permissions)
    VALUES ('prefabricator', 'Prefabrykator - konfiguracja i weryfikacja urządzeń', 
      jsonb_build_object(
        'prefabrication', jsonb_build_object('read', true, 'receiveOrder', true, 'configure', true, 'verify', true, 'assignSerial', true, 'complete', true),
        'network', jsonb_build_object('read', true, 'viewMatrix', true),
        'notifications', jsonb_build_object('receiveAlerts', true)
      )
    );
  END IF;

  -- Worker
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'worker') THEN
    INSERT INTO roles (name, description, permissions)
    VALUES ('worker', 'Pracownik magazynu - kompletacja i skanowanie', 
      jsonb_build_object(
        'completion', jsonb_build_object('read', true, 'scan', true, 'assignPallet', true, 'reportMissing', true, 'complete', true),
        'notifications', jsonb_build_object('receiveAlerts', true)
      )
    );
  END IF;
END
$$;

-- Komentarz
COMMENT ON COLUMN roles.permissions IS 'Granularne uprawnienia JSONB: contracts, subsystems, network, completion, prefabrication, notifications';
