import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRailwayTables1778976000000 implements MigrationInterface {
  name = 'CreateRailwayTables1778976000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS railway_lines (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        length_km DECIMAL(8,3),
        km_from DECIMAL(8,3),
        km_to DECIMAL(8,3),
        manager VARCHAR(100),
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_railway_lines_code ON railway_lines(code);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS railway_stations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        code VARCHAR(20),
        line_code VARCHAR(20) NOT NULL,
        line_id INTEGER REFERENCES railway_lines(id) ON DELETE CASCADE,
        type VARCHAR(30) NOT NULL DEFAULT 'stacja',
        km_position DECIMAL(8,3),
        latitude DECIMAL(10,7),
        longitude DECIMAL(10,7),
        municipality VARCHAR(100),
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_railway_stations_line_code ON railway_stations(line_code);
      CREATE INDEX IF NOT EXISTS idx_railway_stations_line_km ON railway_stations(line_code, km_position);
      CREATE INDEX IF NOT EXISTS idx_railway_stations_name ON railway_stations USING gin(to_tsvector('simple', name));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS railway_stations`);
    await queryRunner.query(`DROP TABLE IF EXISTS railway_lines`);
  }
}
