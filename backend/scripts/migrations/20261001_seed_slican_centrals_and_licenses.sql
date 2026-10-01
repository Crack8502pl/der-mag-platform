BEGIN;

CREATE TABLE IF NOT EXISTS slican_audio_seed_log (
  seed_key TEXT NOT NULL,
  entity_table TEXT NOT NULL CHECK (entity_table IN (
    'slican_central_specifications', 'slican_license_specifications'
  )),
  entity_id INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (seed_key, entity_table, entity_id)
);

DO $$
DECLARE
  seeded RECORD;
  inserted_count INTEGER := 0;
BEGIN
  FOR seeded IN
    WITH model_defaults(model_token, model_name, max_sip, max_dph, max_audio, max_ivr, max_conference, priority, notes) AS (
      VALUES
        ('NCP-CM300P', 'NCP-CM300P.BC', 200, 10, 10, 0, 40, 10,
          'Seed 20261001; IVR limit requires catalog verification before activation.'),
        ('NCP-CM400P', 'NCP-CM400P.BC', 0, 0, 0, 0, 0, 20,
          'Seed 20261001; limits require catalog verification before activation.'),
        ('NCP-CM600P', 'NCP-CM600P.BC', 0, 0, 0, 0, 0, 30,
          'Seed 20261001; limits require catalog verification before activation.')
    )
    INSERT INTO slican_central_specifications (
      warehouse_stock_id, model_name, max_sip_voip_subscribers,
      max_dph_ip_devices, max_audio_ip_devices, max_ivr_channels,
      max_conference_channels, priority, is_active, notes
    )
    SELECT ws.id, d.model_name, d.max_sip, d.max_dph, d.max_audio, d.max_ivr,
           d.max_conference, d.priority, FALSE, d.notes
    FROM warehouse_stock ws
    JOIN model_defaults d ON ws.material_name ILIKE '%' || d.model_token || '%'
    WHERE NOT EXISTS (
      SELECT 1
      FROM slican_central_specifications existing
      WHERE existing.warehouse_stock_id = ws.id
    )
    ON CONFLICT (warehouse_stock_id) DO NOTHING
    RETURNING id, warehouse_stock_id, model_name
  LOOP
    INSERT INTO slican_audio_seed_log (seed_key, entity_table, entity_id)
    VALUES ('20261001_seed_slican_centrals_and_licenses',
            'slican_central_specifications', seeded.id)
    ON CONFLICT DO NOTHING;
    inserted_count := inserted_count + 1;
    RAISE NOTICE 'Seeded central id %, stock id %, model %',
      seeded.id, seeded.warehouse_stock_id, seeded.model_name;
  END LOOP;
  RAISE NOTICE 'Seeded % Slican central specifications', inserted_count;

  inserted_count := 0;
  FOR seeded IN
    WITH license_defaults(license_type, demand_field, name_token, package_size, priority) AS (
      VALUES
        ('VOIP_SUBSCRIBER', 'sipVoipSubscribers', '%VOIP%', 1, 30),
        ('VOIP_SUBSCRIBER', 'sipVoipSubscribers', '%VOIP%', 10, 20),
        ('VOIP_SUBSCRIBER', 'sipVoipSubscribers', '%VOIP%', 100, 10),
        ('AUDIO', 'audioDevices', '%AUDIO%', 1, 30),
        ('AUDIO', 'audioDevices', '%AUDIO%', 10, 20),
        ('AUDIO', 'audioDevices', '%AUDIO%', 100, 10),
        ('IVR', 'ivrChannels', '%IVR%', 1, 30),
        ('IVR', 'ivrChannels', '%IVR%', 10, 20),
        ('IVR', 'ivrChannels', '%IVR%', 100, 10),
        ('CONFERENCE', 'conferenceChannels', '%CONFERENC%', 1, 30),
        ('CONFERENCE', 'conferenceChannels', '%CONFERENC%', 10, 20),
        ('CONFERENCE', 'conferenceChannels', '%CONFERENC%', 100, 10)
    )
    INSERT INTO slican_license_specifications (
      warehouse_stock_id, license_type, package_size, demand_field, is_active, priority
    )
    SELECT ws.id, d.license_type, d.package_size, d.demand_field, FALSE, d.priority
    FROM warehouse_stock ws
    CROSS JOIN license_defaults d
    WHERE (ws.material_name ILIKE '%SLICAN%' OR ws.manufacturer ILIKE '%SLICAN%')
      AND (
        ws.material_name ILIKE '%LICEN%'
        OR ws.material_name ILIKE '% LIC %'
        OR ws.material_name ILIKE '% LIC-%'
        OR ws.material_name ILIKE '% LIC.%'
      )
      AND ws.material_name ILIKE d.name_token
      AND regexp_replace(ws.material_name, '[^0-9]+', ' ', 'g')
            ~ ('(^| )' || d.package_size::TEXT || '( |$)')
      AND NOT EXISTS (
        SELECT 1
        FROM slican_license_specifications existing
        WHERE existing.warehouse_stock_id = ws.id
      )
    ON CONFLICT (warehouse_stock_id) DO NOTHING
    RETURNING id, warehouse_stock_id, license_type, package_size
  LOOP
    INSERT INTO slican_audio_seed_log (seed_key, entity_table, entity_id)
    VALUES ('20261001_seed_slican_centrals_and_licenses',
            'slican_license_specifications', seeded.id)
    ON CONFLICT DO NOTHING;
    inserted_count := inserted_count + 1;
    RAISE NOTICE 'Seeded license id %, stock id %, type %, package %',
      seeded.id, seeded.warehouse_stock_id, seeded.license_type, seeded.package_size;
  END LOOP;
  RAISE NOTICE 'Seeded % Slican license specifications', inserted_count;
END $$;

COMMIT;
