// Formats the file an agent just wrote, so a diff never mixes edits with
// whitespace the pre-commit hook would have rewritten anyway.

import { spawnSync } from 'node:child_process'

const FORMATTABLE = /\.(js|mjs|vue|css|json|md|yml|yaml)$/

const chunks = []
for await (const chunk of process.stdin) chunks.push(chunk)

let path = ''
try {
  path = JSON.parse(chunks.join('')).tool_input?.file_path ?? ''
} catch {
  process.exit(0)
}

// No shell: the path is data, not part of a command line.
if (FORMATTABLE.test(path)) spawnSync('npx', ['prettier', '--write', path], { stdio: 'ignore' })
