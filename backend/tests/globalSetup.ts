// Polyfill dla glob.sync (kompatybilność glob@11 z Jest)
import { globSync } from 'glob';

const glob = require('glob');
if (!glob.sync) {
  glob.sync = globSync;
}

export default async function globalSetup() {
  // Polyfill został zastosowany w czasie importu modułu
  console.log('Global setup: glob.sync polyfill applied for glob@11 compatibility');
}
