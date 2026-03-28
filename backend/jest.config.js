// Polyfill glob.sync in the main Jest process (used by CoverageReporter._checkThreshold)
// glob@11 exports globSync instead of sync; this must run here so it is applied before
// reporters are initialised — setupFiles only runs inside test-environment worker processes.
const glob = require('glob');
if (typeof glob.sync !== 'function' && typeof glob.globSync === 'function') {
  glob.sync = glob.globSync;
}

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  coverageProvider: 'v8',

  // Load glob polyfill BEFORE test environment setup
  setupFiles: ['<rootDir>/tests/jestGlobPolyfill.js'],

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/**/*.d.ts',
    '!src/migrations/**',
    '!src/generated/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
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
