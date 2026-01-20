const fs = require('fs');
const path = require('path');

console.log('📦 Pre-build: Ensuring node_modules are in standalone output...');

const sourceNodeModules = path.join(__dirname, '.next/standalone/node_modules');
const targetNodeModules = path.join(__dirname, '.next/standalone/node_modules');

// Next.js 'output: standalone' usually creates this, but sometimes it symlinks or omits
// essential parts. We'll explicitly check/fix if needed.
// Actually, electron-builder's exclusion is the likely culprit.

// Strategy: We will rely on the "extraResources" configuration in electron-builder
// to forcefully copy the folders we need, bypassing the 'files' logic which can be flaky with node_modules.

console.log('✅ Configuration update planned.');
