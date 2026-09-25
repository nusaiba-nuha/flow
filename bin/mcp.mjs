// The MCP server's Node side: newline-delimited JSON-RPC on stdin and stdout,
// and a folder of .flow files. Everything else lives in src/mcp/server.js.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline'

import { createServer } from '../src/mcp/server.js'
import { sketchFont } from './sketchFont.mjs'

/** Folders no diagram lives in, skipped so a listing stays quick. */
const SKIPPED = new Set(['node_modules', '.git', 'dist', 'coverage'])

/** @param {string} folder */
export function serve(folder) {
  const root = resolve(folder)
  const inside = (path) => {
    const full = resolve(root, path)
    return full === root || full.startsWith(root + sep) ? full : null
  }

  const handle = createServer({
    resolve: inside,
    sketchFont,
    readFile: (path) => readFile(inside(path), 'utf8'),
    writeFile: async (path, text) => {
      const full = inside(path)
      await mkdir(dirname(full), { recursive: true })
      await writeFile(full, text)
    },
    listFiles: async () => {
      const entries = await readdir(root, { recursive: true, withFileTypes: true })
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => relative(root, resolve(entry.parentPath, entry.name)))
        .filter((path) => !path.split(sep).some((part) => SKIPPED.has(part)))
        .map((path) => path.split(sep).join('/'))
    },
  })

  const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`)
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity })

  lines.on('line', async (line) => {
    if (!line.trim()) return
    let message
    try {
      message = JSON.parse(line)
    } catch {
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })
      return
    }
    const response = await handle(message)
    if (response) send(response)
  })

  // Logs go to stderr: stdout carries the protocol and nothing else.
  process.stderr.write(`isketch MCP server: diagrams in ${root}\n`)
}
