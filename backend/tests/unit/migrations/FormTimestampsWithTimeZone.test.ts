import { QueryRunner } from 'typeorm';
import { FormTimestampsWithTimeZone1793491800000 } from '../../../src/migrations/20261101_form_timestamps_with_time_zone';

describe('FormTimestampsWithTimeZone migration', () => {
  it('converts legacy timestamps using their source time zones', async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as unknown as QueryRunner;

    await new FormTimestampsWithTimeZone1793491800000().up(queryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining(
      "submitted_at AT TIME ZONE 'Europe/Warsaw'",
    ));
    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining(
      "created_at AT TIME ZONE 'UTC'",
    ));
    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining(
      "decided_at AT TIME ZONE 'UTC'",
    ));
    expect(queryRunner.query).toHaveBeenCalledTimes(1);
  });

  it('reverses the timestamp conversion with the same explicit zones', async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as unknown as QueryRunner;

    await new FormTimestampsWithTimeZone1793491800000().down(queryRunner);

    const sql = jest.mocked(queryRunner.query).mock.calls[0][0] as string;
    expect(sql).toContain('TIMESTAMP WITHOUT TIME ZONE');
    expect(sql).toContain("submitted_at AT TIME ZONE 'Europe/Warsaw'");
    expect(sql).toContain("created_at AT TIME ZONE 'UTC'");
    expect(sql).toContain("decided_at AT TIME ZONE 'UTC'");
  });
});
