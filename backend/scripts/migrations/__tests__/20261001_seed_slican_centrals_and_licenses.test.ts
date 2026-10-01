import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const { Client } = require('pg');

const databaseUrl = process.env.SLICAN_AUDIO_TEST_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;

databaseDescribe('20261001 Slican seed migration', () => {
  let client: any;
  let schemaName: string;

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
    schemaName = `slican_audio_seed_test_${randomBytes(6).toString('hex')}`;
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}", public`);
    await client.query(`
      CREATE TABLE warehouse_stock (
        id SERIAL PRIMARY KEY,
        material_name VARCHAR(500) NOT NULL,
        manufacturer VARCHAR(500)
      )
    `);
    await client.query(readFileSync(resolve(__dirname, '../20260930_add_slican_audio_specs.sql'), 'utf8'));
    await client.query(`
      INSERT INTO warehouse_stock (material_name, manufacturer) VALUES
        ('NCP-CM300P central', 'Slican'),
        ('NCP-CM400P central', 'Slican'),
        ('NCP-CM600P central', 'Slican'),
        ('Slican VOIP Lic 1', 'Slican'),
        ('Slican VOIP Lic 10', 'Slican'),
        ('Slican VOIP Lic 100', 'Slican'),
        ('Slican AUDIO Lic 1', 'Slican'),
        ('Slican AUDIO Lic 10', 'Slican'),
        ('Slican AUDIO Lic 100', 'Slican'),
        ('Slican IVR Lic 1', 'Slican'),
        ('Slican IVR Lic 10', 'Slican'),
        ('Slican IVR Lic 100', 'Slican'),
        ('Slican CONFERENCE Lic 1', 'Slican'),
        ('Slican CONFERENCE Lic 10', 'Slican'),
        ('Slican CONFERENCE Lic 100', 'Slican'),
        ('Manually configured central', 'Slican')
    `);
    await client.query(`
      INSERT INTO slican_central_specifications (
        warehouse_stock_id, model_name, max_sip_voip_subscribers,
        max_dph_ip_devices, max_audio_ip_devices, max_ivr_channels,
        max_conference_channels
      ) VALUES (16, 'Manual central', 20, 2, 2, 2, 2)
    `);
  });

  afterAll(async () => {
    if (!client) return;
    if (schemaName) await client.query(`DROP SCHEMA "${schemaName}" CASCADE`);
    await client.end();
  });

  it('is idempotent and rollback removes only rows inserted by the seed', async () => {
    const seedSql = readFileSync(resolve(__dirname, '../20261001_seed_slican_centrals_and_licenses.sql'), 'utf8');
    await client.query(seedSql);
    await client.query(seedSql);

    const seeded = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM slican_central_specifications) AS centrals,
        (SELECT COUNT(*) FROM slican_license_specifications) AS licenses,
        (SELECT COUNT(*) FROM slican_audio_seed_log) AS logged_rows
    `);
    expect(seeded.rows[0]).toEqual({ centrals: '4', licenses: '12', logged_rows: '15' });
    const inactive = await client.query(`
      SELECT
        (SELECT COUNT(*)
         FROM slican_central_specifications specification
         JOIN slican_audio_seed_log seed ON seed.entity_id = specification.id
         WHERE seed.seed_key = '20261001_seed_slican_centrals_and_licenses'
           AND seed.entity_table = 'slican_central_specifications'
           AND specification.is_active) +
        (SELECT COUNT(*)
         FROM slican_license_specifications specification
         JOIN slican_audio_seed_log seed ON seed.entity_id = specification.id
         WHERE seed.seed_key = '20261001_seed_slican_centrals_and_licenses'
           AND seed.entity_table = 'slican_license_specifications'
           AND specification.is_active) AS active_count
    `);
    expect(inactive.rows[0].active_count).toBe('0');

    await client.query(readFileSync(
      resolve(__dirname, '../../rollback/20261001_remove_slican_centrals_and_licenses.sql'),
      'utf8'
    ));
    const remaining = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM slican_central_specifications) AS centrals,
        (SELECT COUNT(*) FROM slican_license_specifications) AS licenses,
        (SELECT COUNT(*) FROM warehouse_stock) AS stock
    `);
    expect(remaining.rows[0]).toEqual({ centrals: '1', licenses: '0', stock: '16' });
  });
});
