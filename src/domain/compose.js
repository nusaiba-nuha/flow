import { parse } from 'yaml'

import { SHAPE } from './constants.js'
import { DOCUMENT_VERSION, edgeIdFor } from './document.js'

export const COMPOSE_ORIGIN = 'compose'

/** What an image usually is, from its name. First match wins. */
const KINDS = Object.freeze([
  {
    shape: SHAPE.DATABASE,
    pattern:
      /postgres|postgis|mysql|mariadb|mongo|redis|valkey|memcached|cassandra|scylla|elasticsearch|opensearch|clickhouse|cockroach|timescale|influx|couchdb|neo4j|dynamodb/i,
  },
  { shape: SHAPE.DATA, pattern: /rabbitmq|kafka|redpanda|nats|activemq|pulsar|zookeeper|sqs/i },
  { shape: SHAPE.DOCUMENT, pattern: /minio|localstack|azurite|seaweedfs/i },
  { shape: SHAPE.TERMINAL, pattern: /nginx|traefik|haproxy|envoy|caddy|kong/i },
])

/**
 * A `docker-compose.yml` as a diagram: each service a node, each `depends_on`
 * or `links` entry an edge from the service to what it needs.
 *
 * @param {string} text
 * @returns {{ document: import('./types.js').FlowDocument | null, warnings: { line: number, message: string }[] }}
 */
export function fromCompose(text) {
  /** @type {any} */
  let parsed
  try {
    parsed = parse(String(text ?? ''), { merge: true })
  } catch (error) {
    const line = /** @type {any} */ (error)?.linePos?.[0]?.line ?? 1
    return { document: null, warnings: [{ line, message: 'This is not valid YAML.' }] }
  }

  const services = parsed?.services
  if (!services || typeof services !== 'object' || Array.isArray(services)) {
    return {
      document: null,
      warnings: [{ line: 1, message: 'No `services:` section, so there is nothing to draw.' }],
    }
  }

  const idFor = new Map(Object.keys(services).map((name) => [name, name.replace(/[^\w-]/g, '_')]))

  const nodes = Object.entries(services).map(([name, service]) => ({
    id: /** @type {string} */ (idFor.get(name)),
    type: shapeFor(service),
    name,
    data: { description: describe(service), origin: COMPOSE_ORIGIN },
  }))

  /** @type {import('./types.js').FlowEdge[]} */
  const edges = []
  /** @type {{ line: number, message: string }[]} */
  const warnings = []
  const lines = String(text).split(/\r?\n/)
  /** @param {string} name */
  const lineOf = (name) =>
    lines.findIndex((row) => new RegExp(`^\\s+["']?${escapeRegExp(name)}["']?\\s*:`).test(row)) +
      1 || 1

  Object.entries(services).forEach(([name, service]) => {
    const source = /** @type {string} */ (idFor.get(name))
    needs(service).forEach((dependency) => {
      const target = idFor.get(dependency)
      if (!target) {
        warnings.push({
          line: lineOf(name),
          message: `${name} needs "${dependency}", which is not a service here.`,
        })
        return
      }
      if (target === source) return
      const id = edgeIdFor(source, target)
      if (!edges.some((edge) => edge.id === id)) {
        edges.push({ id, source, target, origin: COMPOSE_ORIGIN })
      }
    })
  })

  const title = typeof parsed.name === 'string' ? parsed.name : 'Services'
  return { document: { version: DOCUMENT_VERSION, title, nodes, edges }, warnings }
}

/** @param {any} service */
function shapeFor(service) {
  const image = String(service?.image ?? '')
  return KINDS.find(({ pattern }) => pattern.test(image))?.shape ?? SHAPE.PROCESS
}

/**
 * Image or build context, then published ports: what someone reading the
 * diagram would look up in the file.
 * @param {any} service
 */
function describe(service) {
  const build = typeof service?.build === 'string' ? service.build : service?.build?.context
  const source = service?.image ?? (build ? `build ${build}` : '')
  const ports = (Array.isArray(service?.ports) ? service.ports : [])
    .map((/** @type {any} */ port) =>
      typeof port === 'object' ? `${port.published ?? ''}:${port.target ?? ''}` : String(port),
    )
    .filter(Boolean)

  return [source, ports.length ? `ports ${ports.join(', ')}` : ''].filter(Boolean).join(' · ')
}

/**
 * `depends_on` as a list or a map, and `links` as `service` or `service:alias`.
 * @param {any} service
 * @returns {string[]}
 */
function needs(service) {
  const dependsOn = service?.depends_on
  const fromDepends = Array.isArray(dependsOn)
    ? dependsOn
    : dependsOn && typeof dependsOn === 'object'
      ? Object.keys(dependsOn)
      : []
  const fromLinks = (Array.isArray(service?.links) ? service.links : []).map(
    (/** @type {string} */ link) => String(link).split(':')[0],
  )

  return [...fromDepends, ...fromLinks].map(String)
}

/** @param {string} text */
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
