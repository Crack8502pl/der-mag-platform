// Testy regresji R1-R12 (docs/etap-2/REGRESJA.md) na prawdziwym, uruchomionym serwerze.
// Uruchamiane wyłącznie przez `npm run test:regression`; domyślne `npm test` ich nie obejmuje.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/regression'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 60000,
  verbose: true,
};
