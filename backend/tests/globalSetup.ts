// Polyfill for glob.sync (glob@11 compatibility with Jest)
// Use require() directly to patch the CommonJS module cache so all consumers see the fix
const glob = require('glob') as { sync?: Function; globSync: Function };
if (!glob.sync) {
  glob.sync = glob.globSync;
}

export default async function globalSetup() {
  // Polyfill is applied at module import time via the require() cache patch above
}
