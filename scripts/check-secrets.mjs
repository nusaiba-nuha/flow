// Scans what is about to be committed for credentials. Local, offline, and
// patterns only: it runs before every commit, so it has to be fast and quiet.
//
// GitGuardian in CI is the backstop. This one fails before the secret is ever
// in a commit, which is the difference between a fix and a key rotation.

import { execFileSync } from 'node:child_process'

const RULES = [
  [/AKIA[0-9A-Z]{16}/, 'AWS access key id'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/gh[pousr]_[A-Za-z0-9]{36}/, 'GitHub token'],
  [/xox[abprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/sk-[A-Za-z0-9]{32,}/, 'API secret key'],
  [/aws_secret_access_key\s*=\s*\S+/i, 'AWS secret'],
  [/(password|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{16,}['"]/i, 'hardcoded credential'],
]

const git = (args) => execFileSync('git', args, { encoding: 'utf8' })

const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACM']).split('\n').filter(Boolean)

const found = []

for (const file of staged) {
  if (/(^|\/)\.env(?!\.example)($|\.)/.test(file)) {
    found.push(`${file}: an environment file is staged`)
  }
}

// Added lines only. Existing code is not this hook's business, and scanning it
// would make every commit in a large file slow and noisy.
for (const line of git(['diff', '--cached', '-U0']).split('\n')) {
  if (!line.startsWith('+') || line.startsWith('+++')) continue

  for (const [pattern, label] of RULES) {
    if (pattern.test(line)) found.push(`${label}: ${line.slice(1, 80).trim()}`)
  }
}

if (found.length) {
  console.error('\nRefusing to commit. Possible credentials:\n')
  for (const entry of found) console.error(`  ${entry}`)
  console.error('\nRemove them, or keep the value in .env. If this is a false positive,')
  console.error('commit with --no-verify and say why in the message.\n')
  process.exit(1)
}
