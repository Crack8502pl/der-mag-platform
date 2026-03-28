// Polyfill glob.sync for glob@11 compatibility in Jest test-environment worker processes.
// glob@11 exports globSync instead of sync method.
// NOTE: this file runs via setupFiles which only covers worker processes, not the main
// Jest process. The same polyfill is also applied at the top of jest.config.js so that
// reporters (e.g. CoverageReporter._checkThreshold) are covered in the main process.

const glob = require('glob');
if (typeof glob.sync !== 'function' && typeof glob.globSync === 'function') {
  glob.sync = glob.globSync;
}
