// Mock for TypeORM DataSource and repositories
import { Repository, SelectQueryBuilder, FindOptionsWhere, FindOneOptions, ObjectLiteral } from 'typeorm';

/**
 * Creates a mock repository with common methods
 */
export const createMockRepository = <T extends ObjectLiteral>(): jest.Mocked<Repository<T>> => {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
  } as any;
};

/**
 * Creates a mock query builder
 */
export const createMockQueryBuilder = <T extends ObjectLiteral>(): jest.Mocked<SelectQueryBuilder<T>> => {
  const queryBuilder: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getCount: jest.fn(),
    execute: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };
  return queryBuilder;
};

/**
 * Creates a mock DataSource
 */
export const createMockDataSource = () => {
  return {
    getRepository: jest.fn(),
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
      },
      hasTable: jest.fn().mockResolvedValue(false),
      query: jest.fn(),
    })),
    manager: {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    initialize: jest.fn(),
    destroy: jest.fn(),
    isInitialized: true,
  };
};

/**
 * Mock AppDataSource for testing
 */
export const mockAppDataSource = createMockDataSource();

/**
 * Simple mockRepository for basic testing
 */
export const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    execute: jest.fn(),
  })),
};

/**
 * Simple mockDataSource for basic testing
 */
export const mockDataSource = {
  getRepository: jest.fn(() => mockRepository),
  createQueryRunner: jest.fn(() => ({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
      remove: jest.fn(),
    },
  })),
  initialize: jest.fn().mockResolvedValue(true),
  destroy: jest.fn().mockResolvedValue(true),
  isInitialized: true,
};

