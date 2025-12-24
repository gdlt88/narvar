#!/usr/bin/env node

/**
 * Dynamic test runner for cartridges
 * 
 * Usage:
 *   npm run test:cartridge -- <cartridge-name>
 *   npm run test:cartridge -- int_promise_delivery
 *   npm run test:cartridge -- int_promise_delivery --watch
 *   npm run test:cartridge -- int_promise_delivery --coverage
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: npm run test:cartridge -- <cartridge-name> [options]

Options:
  --watch      Run tests in watch mode
  --coverage   Generate coverage report

Examples:
  npm run test:cartridge -- int_promise_delivery
  npm run test:cartridge -- int_promise_delivery --watch
  npm run test:cartridge -- int_promise_delivery --coverage

Available cartridges:`);

    // List available cartridges with tests
    const testDir = path.join(process.cwd(), 'test', 'unit');
    if (fs.existsSync(testDir)) {
        const entries = fs.readdirSync(testDir, { withFileTypes: true });
        entries
            .filter(entry => entry.isDirectory() && entry.name !== 'pwa-kit')
            .forEach(entry => console.log(`  - ${entry.name}`));
    }
    
    process.exit(0);
}

const cartridgeName = args[0];
const watchMode = args.includes('--watch');
const coverageMode = args.includes('--coverage');

// Verify the test directory exists
const testPath = path.join(process.cwd(), 'test', 'unit', cartridgeName);
if (!fs.existsSync(testPath)) {
    console.error(`Error: No tests found for cartridge "${cartridgeName}"`);
    console.error(`Expected test directory: ${testPath}`);
    process.exit(1);
}

// Build the mocha command
const mochaArgs = ['--recursive', `test/unit/${cartridgeName}/**/*.test.js`];

if (watchMode) {
    mochaArgs.push('--watch');
}

let command = 'mocha';
let finalArgs = mochaArgs;

if (coverageMode) {
    command = 'nyc';
    finalArgs = ['--reporter=html', '--reporter=text', 'mocha', ...mochaArgs];
}

// Use npx to run the command
const npxArgs = [command, ...finalArgs];

console.log(`Running: npx ${npxArgs.join(' ')}\n`);

const child = spawn('npx', npxArgs, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
});

child.on('close', (code) => {
    process.exit(code);
});

