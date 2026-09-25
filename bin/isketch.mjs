#!/usr/bin/env node
// A thin shell: everything that can be tested lives in src/cli/run.js.
import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'

import { run } from '../src/cli/run.js'
import { sketchFont } from './sketchFont.mjs'

if (process.argv[2] === 'mcp') {
  // A long-running server, not a command that exits.
  const { serve } = await import('./mcp.mjs')
  serve(process.argv[3] ?? '.')
} else {
  const code = await run(process.argv.slice(2), {
    readFile: (path) => readFile(path, 'utf8'),
    writeFile: (path, text) => writeFile(path, text),
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
    sketchFont,
  })

  process.exit(code)
}
