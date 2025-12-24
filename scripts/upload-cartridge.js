#!/usr/bin/env node

/**
 * Upload a specific cartridge to SFCC sandbox using sgmf-scripts
 *
 * Usage:
 *   npm run upload:cartridge -- <cartridge-name>
 *   npm run upload:cartridge -- int_promise_delivery
 *   npm run upload:cartridge -- int_promise_delivery --watch
 *
 * Requirements:
 *   - dw.json file with sandbox credentials in project root
 */

const {spawn} = require('child_process')
const path = require('path')
const fs = require('fs')

const args = process.argv.slice(2)

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: npm run upload:cartridge -- <cartridge-name> [options]

Options:
  --watch    Watch for changes and upload automatically

Examples:
  npm run upload:cartridge -- int_promise_delivery
  npm run upload:cartridge -- int_promise_delivery --watch

Available cartridges:`)

    // List available cartridges
    const cartridgesDir = path.join(process.cwd(), 'cartridges')
    if (fs.existsSync(cartridgesDir)) {
        const entries = fs.readdirSync(cartridgesDir, {withFileTypes: true})
        entries.filter((entry) => entry.isDirectory()).forEach((entry) => console.log(`  - ${entry.name}`))
    }

    process.exit(0)
}

const cartridgeName = args[0]
const watchMode = args.includes('--watch')

// Verify dw.json exists
const dwJsonPath = path.join(process.cwd(), 'dw.json')
if (!fs.existsSync(dwJsonPath)) {
    console.error('Error: dw.json not found in project root')
    console.error('Please create a dw.json file with your sandbox credentials:')
    console.error(`
{
  "hostname": "your-sandbox.dx.commercecloud.salesforce.com",
  "username": "your-username",
  "password": "your-password",
  "code-version": "version1"
}`)
    process.exit(1)
}

// Verify the cartridge directory exists
const cartridgePath = path.join(process.cwd(), 'cartridges', cartridgeName)
if (!fs.existsSync(cartridgePath)) {
    console.error(`Error: Cartridge "${cartridgeName}" not found`)
    console.error(`Expected path: ${cartridgePath}`)
    process.exit(1)
}

// Build the sgmf-scripts command
const command = watchMode ? 'sgmf-scripts' : 'sgmf-scripts'
const sgmfArgs = watchMode
    ? ['--uploadCartridge', cartridgeName, '--watch']
    : ['--uploadCartridge', cartridgeName]

console.log(`Uploading cartridge: ${cartridgeName}`)
console.log(`Mode: ${watchMode ? 'Watch (continuous upload)' : 'Single upload'}`)
console.log(`Command: npx ${command} ${sgmfArgs.join(' ')}\n`)

const child = spawn('npx', [command, ...sgmfArgs], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
})

child.on('close', (code) => {
    if (code === 0) {
        console.log(`\n✓ Cartridge "${cartridgeName}" uploaded successfully`)
    } else {
        console.error(`\n✗ Upload failed with exit code ${code}`)
    }
    process.exit(code)
})

child.on('error', (err) => {
    console.error('Failed to start upload process:', err.message)
    process.exit(1)
})

