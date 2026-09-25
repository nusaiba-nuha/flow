import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { NestExpressApplication } from '@nestjs/platform-express'
import type pg from 'pg'

import { createApp } from '../src/app.js'
import { readConfig } from '../src/config.js'
import { openPool } from '../src/database.js'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres@localhost:5432/isketch_test'
const FLOW = 'title: Shop\n\napi = process "API"\ndb = database "Orders"\napi -> db : SQL\n'

let app: NestExpressApplication
let pool: pg.Pool
let base = ''
let nextId = 1

before(async () => {
  pool = await openPool(DATABASE_URL)
  app = await createApp(readConfig({ DATABASE_URL, PUBLIC_URL: 'https://isketch.test' }), pool)
  await app.listen(0)
  base = await app.getUrl()
})

after(async () => {
  await app.close()
  await pool.end()
})

const rpc = async (method: string, params?: object) =>
  fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  })

async function call(name: string, args: object) {
  const response = await rpc('tools/call', { name, arguments: args })
  const body = (await response.json()) as {
    result: { content: { text: string }[]; isError?: boolean }
  }
  return { text: body.result.content[0].text, isError: body.result.isError === true }
}

describe('the hosted MCP server', () => {
  it('introduces itself and lists its tools', async () => {
    const init = (await (await rpc('initialize', { protocolVersion: '2025-06-18' })).json()) as {
      result: { serverInfo: { name: string }; instructions: string }
    }
    assert.equal(init.result.serverInfo.name, 'isketch')
    assert.match(init.result.instructions, /give it to the person/)

    const list = (await (await rpc('tools/list')).json()) as {
      result: { tools: { name: string }[] }
    }
    assert.deepEqual(
      list.result.tools.map((tool) => tool.name),
      ['read_diagram', 'publish_diagram', 'update_diagram'],
    )
  })

  it('accepts a notification without an answer, and refuses GET', async () => {
    const notification = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    })
    assert.equal(notification.status, 202)
    assert.equal((await fetch(`${base}/mcp`)).status, 405)
  })

  it('publishes, reads by link and updates with the token, saying what changed', async () => {
    const published = await call('publish_diagram', { text: FLOW })
    const link = /Published at (\S+)/.exec(published.text)?.[1] ?? ''
    const token = /keep it private\): (\S+)/.exec(published.text)?.[1] ?? ''
    assert.match(link, /^https:\/\/isketch\.test\/d\/[A-Za-z0-9]{14}$/)

    assert.match((await call('read_diagram', { link })).text, /- \*\*API\*\* → \*\*Orders\*\*: SQL/)
    assert.match(
      (await call('read_diagram', { link: link.split('/').at(-1), format: 'flow' })).text,
      /api -> db : SQL/,
    )

    const refused = await call('update_diagram', { link, token: 'wrong', text: FLOW })
    assert.deepEqual(refused, {
      text: 'That edit token does not match this diagram.',
      isError: true,
    })

    const updated = await call('update_diagram', {
      link,
      token,
      text: `${FLOW}cache = database "Redis"\napi -> cache\n`,
    })
    assert.equal(updated.isError, false)
    assert.match(updated.text, /revision 2:\n\+ Redis\n\+ API → Redis/)
  })

  it('hands back line errors and missing links as tool errors the agent can act on', async () => {
    const bad = await call('publish_diagram', { text: 'a = hexagon "A"' })
    assert.equal(bad.isError, true)
    assert.match(bad.text, /^The \.flow text has errors\.\nline 1: Unknown shape "hexagon"/)

    const missing = await call('read_diagram', { link: 'https://isketch.test/d/nothingHere999' })
    assert.equal(missing.isError, true)
    assert.match(missing.text, /No diagram at this link/)
  })
})
