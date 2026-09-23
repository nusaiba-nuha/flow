// Refuses an agent write to a path that is generated, installed, or secret.
// Reads the hook payload on stdin; exit 2 blocks the tool call.

const BLOCKED = [/(^|\/)\.env(?!\.example)($|\.)/, /^dist\//, /^coverage\//, /^node_modules\//, /^\.git\//]

const chunks = []
for await (const chunk of process.stdin) chunks.push(chunk)

let path = ''
try {
  path = JSON.parse(chunks.join('')).tool_input?.file_path ?? ''
} catch {
  process.exit(0)
}

const relative = path.replace(`${process.env.CLAUDE_PROJECT_DIR ?? process.cwd()}/`, '')

if (BLOCKED.some((pattern) => pattern.test(relative))) {
  console.error(`Refused: ${relative} is generated, installed, or secret. Edit the source instead.`)
  process.exit(2)
}
