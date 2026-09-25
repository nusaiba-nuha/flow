// @vitest-environment node
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

const BIN = new URL('../../../bin/isketch.mjs', import.meta.url).pathname

let folder
afterEach(() => folder && rm(folder, { recursive: true, force: true }))

/** Send messages to a real `isketch mcp`, and collect one response per request. */
async function session(messages, expected) {
  folder = await mkdtemp(join(tmpdir(), 'isketch-mcp-'))
  const child = spawn(process.execPath, [BIN, 'mcp', folder])
  const responses = []
  let buffer = ''

  const done = new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop()
      lines.filter(Boolean).forEach((line) => responses.push(JSON.parse(line)))
      if (responses.length >= expected) resolve(responses)
    })
    child.on('error', reject)
  })

  messages.forEach((message) =>
    child.stdin.write(
      typeof message === 'string' ? `${message}\n` : `${JSON.stringify(message)}\n`,
    ),
  )
  try {
    return await done
  } finally {
    child.kill()
  }
}

describe('isketch mcp', () => {
  it('speaks JSON-RPC over stdio and writes diagrams into its folder', async () => {
    const responses = await session(
      [
        { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        'not json',
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'write_diagram',
            arguments: { path: 'docs/a.flow', text: 'a = note "A"' },
          },
        },
      ],
      3,
    )

    const byId = (id) => responses.find((response) => response.id === id)
    expect(byId(1).result.serverInfo.name).toBe('isketch')
    expect(byId(null).error.code).toBe(-32700)
    expect(byId(2).result.content[0].text).toMatch(/^Created docs\/a.flow/)
    expect(await readFile(join(folder, 'docs/a.flow'), 'utf8')).toContain('a = note "A"')
  })
})
