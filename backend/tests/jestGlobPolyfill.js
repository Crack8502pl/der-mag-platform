// Polyfill glob.sync for glob@11 compatibility with Jest coverage reporter
// glob@11 exports globSync instead of sync method, which breaks Jest's coverage reporter
// This must be loaded via setupFiles (not setupFilesAfterEnv) to ensure it runs before Jest internals

const glob = require('glob');
if (typeof glob.sync !== 'function' && typeof glob.globSync === 'function') {
  glob.sync = glob.globSync;
}
