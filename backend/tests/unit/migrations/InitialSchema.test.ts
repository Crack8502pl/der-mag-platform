import { QueryRunner } from 'typeorm';
import { InitialSchema1600000000000 } from '../../../src/migrations/1600000000000-InitialSchema';

describe('InitialSchema migration', () => {
  it('skips the baseline schema when a production users table already exists', async () => {
    const queryRunner = {
      hasTable: jest.fn().mockResolvedValue(true),
      query: jest.fn(),
    };

    await new InitialSchema1600000000000().up(queryRunner as unknown as QueryRunner);

    expect(queryRunner.hasTable).toHaveBeenCalledWith('users');
    expect(queryRunner.query).not.toHaveBeenCalled();
  });
});
