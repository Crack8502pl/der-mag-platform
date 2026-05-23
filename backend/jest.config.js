// Ensure Jest's internal glob dependency exposes `default.sync` for CoverageReporter.
try {
  const reportersPkg = require.resolve('@jest/reporters/package.json');
  const jestGlob = require(require.resolve('glob', {
    paths: [require('path').dirname(reportersPkg)]
  }));

  if (typeof jestGlob.sync !== 'function' && typeof jestGlob.globSync === 'function') {
    jestGlob.sync = jestGlob.globSync;
  }
  if (typeof jestGlob.default === 'undefined') {
    jestGlob.default = jestGlob;
  }
} catch {
  // no-op: if resolution fails, Jest will surface the actual error during startup
}

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.js$': ['babel-jest', { plugins: ['@babel/plugin-transform-modules-commonjs'] }],
  },
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  coverageProvider: 'v8',

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/**/*.d.ts',
    '!src/migrations/**',
    '!src/generated/**',
    '!src/entities/**', // TypeORM entity definitions — no business logic
    '!src/dto/**', // class-validator DTO declarations — no business logic
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 60,
      lines: 65,
      statements: 65
    }
  },
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 10000,
  verbose: true
};
