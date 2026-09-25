import { describe, expect, it } from 'vitest'

import { COMPOSE_ORIGIN, fromCompose } from '../compose.js'
import { mergeImport } from '../mergeImport.js'

const COMPOSE = `
name: shop
services:
  web:
    build: ./web
    ports:
      - "8080:80"
    depends_on:
      - api
  api:
    image: node:22-alpine
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    links:
      - queue:mq
  db:
    image: postgres:16
  cache:
    image: redis:7
  queue:
    image: rabbitmq:3-management
  proxy:
    image: traefik:v3
    ports:
      - target: 443
        published: 443
`

describe('fromCompose', () => {
  it('draws each service as a shape that fits its image, described by image and ports', () => {
    const { document, warnings } = fromCompose(COMPOSE)

    expect(warnings).toEqual([])
    expect(document.title).toBe('shop')
    expect(Object.fromEntries(document.nodes.map((node) => [node.id, node.type]))).toEqual({
      web: 'process',
      api: 'process',
      db: 'database',
      cache: 'database',
      queue: 'data',
      proxy: 'terminal',
    })

    const byId = Object.fromEntries(document.nodes.map((node) => [node.id, node]))
    expect(byId.web.data.description).toBe('build ./web · ports 8080:80')
    expect(byId.proxy.data.description).toBe('traefik:v3 · ports 443:443')
    expect(byId.db.data.origin).toBe(COMPOSE_ORIGIN)
  })

  it('connects a service to what it depends on, in list or map form, and its links', () => {
    const { document } = fromCompose(COMPOSE)

    expect(document.edges.map((edge) => `${edge.source}->${edge.target}`)).toEqual([
      'web->api',
      'api->db',
      'api->cache',
      'api->queue',
    ])
    expect(document.edges.every((edge) => edge.origin === COMPOSE_ORIGIN)).toBe(true)
  })

  it('says what it could not use, with the line', () => {
    expect(fromCompose('services: [oops').warnings[0].message).toMatch(/not valid yaml/i)
    expect(fromCompose('version: "3"').warnings[0].message).toMatch(/no `services:`/i)

    const { document, warnings } = fromCompose(
      'services:\n  api:\n    image: node\n    depends_on: [ghost]\n',
    )
    expect(document.nodes).toHaveLength(1)
    expect(warnings).toEqual([
      { line: 2, message: 'api needs "ghost", which is not a service here.' },
    ])
  })
})

describe('mergeImport', () => {
  it('keeps positions and hand-made work, and drops what the file no longer has', () => {
    const first = fromCompose(COMPOSE).document
    const edited = {
      ...first,
      nodes: [
        ...first.nodes.map((node) =>
          node.id === 'db' ? { ...node, position: { x: 500, y: 600 } } : node,
        ),
        { id: 'note', type: 'note', name: 'Ask ops about backups', data: {} },
      ],
      edges: [...first.edges, { id: 'e-note-db', source: 'note', target: 'db' }],
    }

    // The queue is gone from the file, and a worker has arrived.
    const next = fromCompose(
      COMPOSE.replace(/ {2}queue:\n {4}image: rabbitmq:3-management\n/, '').replace(
        '      - queue:mq\n',
        '',
      ) + '  worker:\n    image: node:22-alpine\n    depends_on: [db]\n',
    ).document

    const merged = mergeImport(edited, next, COMPOSE_ORIGIN)
    const ids = merged.nodes.map((node) => node.id)

    expect(ids).toContain('worker')
    expect(ids).not.toContain('queue')
    expect(ids).toContain('note')
    expect(merged.nodes.find((node) => node.id === 'db').position).toEqual({ x: 500, y: 600 })
    expect(merged.edges.map((edge) => edge.id)).toContain('e-note-db')
    expect(merged.edges.map((edge) => edge.id)).toContain('e-worker-db')
    expect(merged.edges.some((edge) => edge.target === 'queue')).toBe(false)
  })
})
