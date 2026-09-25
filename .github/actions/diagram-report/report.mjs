#!/usr/bin/env node
// Prints the pull request comment for every .flow file changed since a base
// commit. Only git and the domain code: nothing to install.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'

import { prReport } from '../../../src/cli/prReport.js'

const [base] = process.argv.slice(2)
if (!base) {
  process.stderr.write('Usage: report.mjs <base commit>\n')
  process.exit(2)
}

/** @param {string[]} args */
const git = (args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    // A file new in this change is not in the base; that is expected, not worth printing.
    stdio: ['ignore', 'pipe', 'ignore'],
  })

/** @param {() => string} read */
const orEmpty = (read) => {
  try {
    return read()
  } catch {
    return ''
  }
}

const paths = git(['diff', '--name-only', '--no-renames', `${base}...HEAD`, '--', '*.flow'])
  .split('\n')
  .filter(Boolean)

const files = paths.map((path) => ({
  path,
  before: orEmpty(() => git(['show', `${base}:${path}`])),
  after: orEmpty(() => readFileSync(path, 'utf8')),
}))

process.stdout.write(prReport(files))
