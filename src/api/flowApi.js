import { migrate } from '@/domain/document.js'
import { FIRST_RUN_SAMPLE, sampleById } from '@/domain/samples.js'
import {
  canConnect,
  toNodeId,
  withEdge,
  withEdgeLabel,
  withNodeRemoved,
  withNodesRemoved,
  withoutEdge,
  withPositions,
} from '@/domain/graph.js'
import { isKnownShape } from '@/domain/nodeMeta.js'

import { STORAGE_KEYS } from './storageKeys.js'

/** Writes only: it exists to make optimistic updates and rollbacks visible. */
const LATENCY_MS = 220

/** One document per browser for now. */
export const STORAGE_KEY = STORAGE_KEYS.DOCUMENT

/** @type {import('@/domain/types.js').FlowDocument | null} */
let flow = null

/** @param {number} ms */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * A JSON round trip, not structuredClone: callers pass Vue reactive proxies,
 * which structuredClone refuses.
 * @template T @param {T} value @returns {T}
 */
const clone = (value) => JSON.parse(JSON.stringify(value))

/**
 * localStorage throws in a private window; a failure here should not break an edit.
 * @template T @param {() => T} action @returns {T | null}
 */
const safely = (action) => {
  try {
    return action()
  } catch {
    return null
  }
}

const save = () => safely(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(flow)))

/** Six hex characters: short enough to read in a URL. */
export const generateNodeId = () => Math.random().toString(16).slice(2, 8).padEnd(6, '0')

/** @param {{ clearStorage?: boolean }} [options] keep the saved flow to simulate a reload */
export function resetFlow({ clearStorage = true } = {}) {
  flow = null
  if (clearStorage) safely(() => localStorage.removeItem(STORAGE_KEY))
}

/**
 * Bundled rather than fetched, so the app has no server to reach and nothing
 * to configure. Async anyway, so a real backend can replace this module.
 * @returns {Promise<import('@/domain/types.js').FlowDocument>}
 */
async function ensureLoaded() {
  if (flow) return flow

  const saved = safely(() => localStorage.getItem(STORAGE_KEY))
  const parsed = saved ? safely(() => migrate(JSON.parse(saved))) : null
  flow = parsed ?? migrate(clone(sampleById(FIRST_RUN_SAMPLE)?.document))
  // Written back at once, so an older shape is only ever migrated once.
  save()
  return flow
}

/** @returns {Promise<import('@/domain/types.js').FlowDocument>} */
export async function fetchFlow() {
  const loaded = await ensureLoaded()
  return clone(loaded)
}

/** @returns {import('@/domain/types.js').FlowDocument} */
const current = () => /** @type {import('@/domain/types.js').FlowDocument} */ (flow)

/** @param {string} id @returns {Record<string, any>} */
function requireNode(id) {
  const node = current().nodes.find((candidate) => toNodeId(candidate.id) === id)
  if (!node) throw new Error(`Node ${id} no longer exists.`)
  return node
}

/**
 * @param {{ title: string, description: string, shape: string, position?: { x: number, y: number } }} input
 * @returns {Promise<Record<string, any>>}
 */
export async function createNode({ title, description, shape, position }) {
  await ensureLoaded()
  if (!isKnownShape(shape)) throw new Error(`Unknown shape: ${shape}.`)

  const node = {
    id: generateNodeId(),
    type: shape,
    name: title,
    data: { description },
    ...(position ? { position } : {}),
  }

  current().nodes.push(node)
  save()
  await delay(LATENCY_MS)
  return clone(node)
}

/**
 * @param {{ id: string, patch: { name?: string, type?: string, position?: { x: number, y: number }, data?: Record<string, any> } }} input
 * @returns {Promise<Record<string, any>>}
 */
export async function updateNode({ id, patch }) {
  await ensureLoaded()
  const node = requireNode(id)

  if (patch.name !== undefined) node.name = patch.name
  if (patch.type !== undefined) {
    if (!isKnownShape(patch.type)) throw new Error(`Unknown shape: ${patch.type}.`)
    node.type = patch.type
  }
  if (patch.position !== undefined) node.position = clone(patch.position)
  if (patch.data !== undefined) node.data = { ...node.data, ...clone(patch.data) }

  save()
  await delay(LATENCY_MS)
  return clone(node)
}

/** @param {{ id: string }} input @returns {Promise<{ id: string }>} */
export async function deleteNode({ id }) {
  await ensureLoaded()
  requireNode(id)

  flow = withNodeRemoved(current(), id)
  save()
  await delay(LATENCY_MS)
  return { id }
}

/**
 * A selection, deleted as one change.
 * @param {{ ids: string[] }} input
 * @returns {Promise<{ ids: string[] }>}
 */
export async function deleteNodes({ ids }) {
  await ensureLoaded()
  ids.forEach(requireNode)

  flow = withNodesRemoved(current(), ids)
  save()
  await delay(LATENCY_MS)
  return { ids }
}

/**
 * A selection, moved as one change.
 * @param {{ positions: Record<string, { x: number, y: number }> }} input
 * @returns {Promise<{ ids: string[] }>}
 */
export async function moveNodes({ positions }) {
  await ensureLoaded()
  const ids = Object.keys(positions)
  ids.forEach(requireNode)

  flow = withPositions(current(), positions)
  save()
  await delay(LATENCY_MS)
  return { ids }
}

/**
 * @param {{ source: string, target: string }} input
 * @returns {Promise<import('@/domain/types.js').FlowEdge>}
 */
export async function connectNodes({ source, target }) {
  await ensureLoaded()

  const refusal = canConnect(current(), source, target)
  if (refusal) throw new Error(refusal)

  flow = withEdge(current(), source, target)
  save()
  await delay(LATENCY_MS)
  return clone(/** @type {import('@/domain/types.js').FlowEdge} */ (current().edges.at(-1)))
}

/**
 * @param {{ id: string, patch: { label: string } }} input
 * @returns {Promise<import('@/domain/types.js').FlowEdge>}
 */
export async function updateEdge({ id, patch }) {
  await ensureLoaded()
  if (!current().edges.some((edge) => edge.id === id)) {
    throw new Error('That connection no longer exists.')
  }

  flow = withEdgeLabel(current(), id, patch.label)
  save()
  await delay(LATENCY_MS)
  return clone(
    /** @type {import('@/domain/types.js').FlowEdge} */ (
      current().edges.find((edge) => edge.id === id)
    ),
  )
}

/** @param {{ id: string }} input @returns {Promise<{ id: string }>} */
export async function disconnect({ id }) {
  await ensureLoaded()
  if (!current().edges.some((edge) => edge.id === id)) {
    throw new Error('That connection no longer exists.')
  }

  flow = withoutEdge(current(), id)
  save()
  await delay(LATENCY_MS)
  return { id }
}

/**
 * Undo, redo and starting a new diagram. No latency: none of them should make
 * you wait.
 * @param {import('@/domain/types.js').FlowDocument} next
 * @returns {Promise<import('@/domain/types.js').FlowDocument>}
 */
export async function replaceFlow(next) {
  flow = clone(next)
  save()
  return clone(flow)
}
