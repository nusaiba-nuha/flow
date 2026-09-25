import { parseFlow } from '../domain/flowText.js'
import { renderSvg } from '../domain/renderSvg.js'

export const USAGE = `Usage:
  flow render <file.flow> [-o <out.svg>] [--dark]   Draw a diagram as SVG
  flow check <file.flow>...                         Report errors, exit 1 if any
`

/**
 * The command line, with its I/O handed in so it tests without a process.
 *
 * @param {string[]} argv the arguments after the command name
 * @param {{
 *   readFile: (path: string) => Promise<string>,
 *   writeFile: (path: string, text: string) => Promise<void>,
 *   stdout: (text: string) => void,
 *   stderr: (text: string) => void,
 * }} io
 * @returns {Promise<number>} the exit code
 */
export async function run(argv, io) {
  const [command, ...rest] = argv

  if (command === 'render') return render(rest, io)
  if (command === 'check') return check(rest, io)

  io.stderr(USAGE)
  return command === undefined || command === '--help' || command === '-h' ? 0 : 2
}

/**
 * @param {string[]} args
 * @param {Parameters<typeof run>[1]} io
 */
async function render(args, io) {
  const dark = args.includes('--dark')
  const outIndex = args.findIndex((arg) => arg === '-o' || arg === '--out')
  const out = outIndex === -1 ? null : args[outIndex + 1]
  const input = args.find(
    (arg, index) => !arg.startsWith('-') && (outIndex === -1 || index !== outIndex + 1),
  )

  if (!input || (outIndex !== -1 && !out)) {
    io.stderr(USAGE)
    return 2
  }

  const document = await read(input, io)
  if (!document) return 1

  const svg = renderSvg(document, { theme: dark ? 'dark' : 'light' })
  if (out) {
    await io.writeFile(out, svg)
    io.stderr(`Rendered ${input} to ${out}\n`)
  } else {
    io.stdout(svg)
  }
  return 0
}

/**
 * @param {string[]} files
 * @param {Parameters<typeof run>[1]} io
 */
async function check(files, io) {
  if (!files.length) {
    io.stderr(USAGE)
    return 2
  }

  let failed = false
  for (const file of files) {
    if (!(await read(file, io))) failed = true
  }
  return failed ? 1 : 0
}

/**
 * Errors in the form editors and CI annotate: `file:line: message`.
 * @param {string} file
 * @param {Parameters<typeof run>[1]} io
 */
async function read(file, io) {
  let text
  try {
    text = await io.readFile(file)
  } catch {
    io.stderr(`${file}: cannot be read\n`)
    return null
  }

  const { document, errors } = parseFlow(text)
  errors.forEach(({ line, message }) => io.stderr(`${file}:${line}: ${message}\n`))
  return document
}
