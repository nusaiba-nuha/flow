import { describe, expect, it } from 'vitest'

import { createServer } from '../server.js'

/** An in-memory folder of files. */
function workspace(files = {}) {
  const inside = (path) => !path.split('/').includes('..') && !path.startsWith('/')
  return {
    files,
    resolve: (path) => (inside(path) ? path : null),
    readFile: async (path) => {
      if (!(path in files)) throw new Error('ENOENT')
      return files[path]
    },
    writeFile: async (path, text) => {
      files[path] = text
    },
    listFiles: async () => Object.keys(files),
  }
}

const GOOD = 'title: Shop\n\napi = process "API"\ndb = database "Orders"\n\napi -> db : SQL\n'

let nextId = 1
/** Call a tool and return its text and whether it failed. */
async function call(handle, name, args = {}) {
  const response = await handle({
    jsonrpc: '2.0',
    id: nextId++,
    method: 'tools/call',
    params: { name, arguments: args },
  })
  return { text: response.result.content[0].text, isError: response.result.isError === true }
}

describe('the protocol', () => {
  it('introduces itself, agreeing a protocol version', async () => {
    const handle = createServer(workspace())
    const known = await handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26' },
    })
    const unknown = await handle({
      jsonrpc: '2.0',
      id: 2,
      method: 'initialize',
      params: { protocolVersion: '1999-01-01' },
    })

    expect(known.result).toMatchObject({
      protocolVersion: '2025-03-26',
      capabilities: { tools: {} },
      serverInfo: { name: 'isketch' },
    })
    expect(known.result.instructions).toMatch(/refer to shapes by their ids/)
    expect(unknown.result.protocolVersion).toBe('2025-06-18')
  })

  it('lists its tools, each with a schema', async () => {
    const response = await createServer(workspace())({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    })

    expect(response.result.tools.map((tool) => tool.name)).toEqual([
      'list_diagrams',
      'read_diagram',
      'write_diagram',
      'render_diagram',
      'diff_diagrams',
    ])
    response.result.tools.forEach((tool) => expect(tool.inputSchema.type).toBe('object'))
  })

  it('answers pings, ignores notifications and refuses what it does not know', async () => {
    const handle = createServer(workspace())

    expect(await handle({ jsonrpc: '2.0', id: 1, method: 'ping' })).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: {},
    })
    expect(await handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull()
    expect((await handle({ jsonrpc: '2.0', id: 2, method: 'resources/list' })).error.code).toBe(
      -32601,
    )
    expect((await handle({ id: 3, method: 'ping' })).error.code).toBe(-32600)
  })
})

describe('the tools', () => {
  it('lists diagrams with their titles, and skips other files', async () => {
    const handle = createServer(
      workspace({ 'docs/shop.flow': GOOD, 'broken.flow': 'a = hexagon', 'README.md': '# Hi' }),
    )

    expect((await call(handle, 'list_diagrams')).text).toBe(
      '- broken.flow: has 1 error(s)\n- docs/shop.flow: "Shop", 2 shapes, 1 connections',
    )
    expect((await call(createServer(workspace()), 'list_diagrams')).text).toMatch(/No .flow/)
  })

  it('reads a diagram as a brief, or as .flow text', async () => {
    const handle = createServer(workspace({ 'shop.flow': GOOD }))

    expect((await call(handle, 'read_diagram', { path: 'shop.flow' })).text).toContain(
      '- **API** → **Orders**: SQL',
    )
    expect((await call(handle, 'read_diagram', { path: 'shop.flow', format: 'flow' })).text).toBe(
      GOOD,
    )
  })

  it('writes a valid diagram and says what changed', async () => {
    const folder = workspace({ 'shop.flow': GOOD })
    const handle = createServer(folder)

    const created = await call(handle, 'write_diagram', { path: 'new.flow', text: 'a = note "A"' })
    expect(created).toEqual({ text: 'Created new.flow: 1 shapes, 0 connections.', isError: false })
    expect(folder.files['new.flow']).toBe('title: Untitled diagram\n\na = note "A"\n')

    const updated = await call(handle, 'write_diagram', {
      path: 'shop.flow',
      text: `${GOOD}cache = database "Redis"\napi -> cache\n`,
    })
    expect(updated.text).toBe('Updated shop.flow:\n+ Redis\n+ API → Redis')
  })

  it('writes nothing when the text has errors, and says where', async () => {
    const folder = workspace({ 'shop.flow': GOOD })
    const result = await call(createServer(folder), 'write_diagram', {
      path: 'shop.flow',
      text: 'a = process "A"\nb = hexagon "B"\n',
    })

    expect(result.isError).toBe(true)
    expect(result.text).toMatch(/^The text has errors:\nline 2: Unknown shape "hexagon"/)
    expect(folder.files['shop.flow']).toBe(GOOD)
  })

  it('refuses paths outside the folder, and files that are not diagrams', async () => {
    const handle = createServer(workspace({ 'shop.flow': GOOD }))

    const outside = await call(handle, 'write_diagram', { path: '../x.flow', text: GOOD })
    const other = await call(handle, 'read_diagram', { path: 'package.json' })
    const missing = await call(handle, 'read_diagram', { path: 'gone.flow' })

    expect(outside).toEqual({ text: '../x.flow is outside the diagrams folder.', isError: true })
    expect(other).toEqual({ text: 'package.json is not a .flow file.', isError: true })
    expect(missing.text).toMatch(/gone.flow does not exist/)
    expect((await call(handle, 'draw')).isError).toBe(true)
  })

  it('renders SVG as text, or to a file', async () => {
    const folder = workspace({ 'shop.flow': GOOD })
    const handle = createServer(folder)

    expect((await call(handle, 'render_diagram', { path: 'shop.flow' })).text).toMatch(/^<svg /)
    expect(
      (await call(handle, 'render_diagram', { path: 'shop.flow', out: 'shop.svg' })).text,
    ).toBe('Rendered shop.flow to shop.svg.')
    expect(folder.files['shop.svg']).toMatch(/^<svg /)
  })

  it('compares a diagram with other text', async () => {
    const handle = createServer(workspace({ 'shop.flow': GOOD }))

    expect(
      (
        await call(handle, 'diff_diagrams', {
          path: 'shop.flow',
          text: GOOD.replace('"API"', '"Gateway"'),
        })
      ).text,
    ).toBe('~ API → Gateway')
    expect((await call(handle, 'diff_diagrams', { path: 'shop.flow', text: GOOD })).text).toBe(
      'No changes.',
    )
  })
})
