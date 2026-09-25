#!/usr/bin/env node
// A thin shell: everything that can be tested lives in src/cli/run.js.
import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'

import { run } from '../src/cli/run.js'

const code = await run(process.argv.slice(2), {
  readFile: (path) => readFile(path, 'utf8'),
  writeFile: (path, text) => writeFile(path, text),
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
})

process.exit(code)
