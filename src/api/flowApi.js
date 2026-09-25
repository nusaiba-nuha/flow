import { CONNECTOR_TYPE, NODE_TYPE, ROOT_PARENT_ID } from '@/domain/constants.js'
import { toNodeId, withNodeRemoved } from '@/domain/graph.js'
import { creatableByValue } from '@/domain/nodeMeta.js'

import starterDiagram from './starterDiagram.json'
import { STORAGE_KEYS } from './storageKeys.js'

/** Writes only: it exists to make optimistic updates and rollbacks visible. */
const LATENCY_MS = 220

/** One document per browser for now. */
export const STORAGE_KEY = STORAGE_KEYS.DOCUMENT

/** @type {Record<string, any>[] | null} */
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

/** Six hex characters, to match the starter diagram's ids. */
export const generateNodeId = () => Math.random().toString(16).slice(2, 8).padEnd(6, '0')

/** @param {{ clearStorage?: boolean }} [options] keep the saved flow to simulate a reload */
export function resetFlow({ clearStorage = true } = {}) {
  flow = null
  if (clearStorage) safely(() => localStorage.removeItem(STORAGE_KEY))
}

/**
 * Bundled rather than fetched, so the app has no server to reach and nothing
 * to configure. Async anyway, so a real backend can replace this module.
 * @returns {Promise<Record<string, any>[]>}
 */
async function ensureLoaded() {
  if (flow) return flow

  const saved = safely(() => localStorage.getItem(STORAGE_KEY))
  const parsed = saved ? safely(() => JSON.parse(saved)) : null
  if (Array.isArray(parsed)) {
    flow = parsed
    return flow
  }

  flow = clone(starterDiagram)
  save()
  return flow
}

/** @returns {Promise<Record<string, any>[]>} */
export async function fetchFlow() {
  const loaded = await ensureLoaded()
  return clone(loaded)
}

/** @param {string} id @returns {Record<string, any>} */
function requireNode(id) {
  const node = flow?.find((candidate) => toNodeId(candidate.id) === id)
  if (!node) throw new Error(`Node ${id} no longer exists.`)
  return node
}

/**
 * A dateTime node always branches, so a created one gets the same shape as a
 * seeded one.
 * @param {Record<string, any>} parent
 * @returns {Record<string, any>[]}
 */
function branchesFor(parent) {
  const branches = [CONNECTOR_TYPE.SUCCESS, CONNECTOR_TYPE.FAILURE].map((connectorType) => ({
    id: generateNodeId(),
    parentId: parent.id,
    type: NODE_TYPE.DATE_TIME_CONNECTOR,
    name: connectorType === CONNECTOR_TYPE.SUCCESS ? 'Success' : 'Failure',
    data: { connectorType },
  }))

  parent.data.connectors = branches.map((branch) => branch.id)
  return branches
}

/**
 * @param {{ title: string, description: string, nodeType: string, parentId?: string, position?: { x: number, y: number } }} input
 * @returns {Promise<Record<string, any>>}
 */
export async function createNode({
  title,
  description,
  nodeType,
  parentId = ROOT_PARENT_ID,
  position,
}) {
  await ensureLoaded()

  const option = creatableByValue(nodeType)
  if (!option) throw new Error(`Unknown node type: ${nodeType}.`)

  const node = {
    id: generateNodeId(),
    parentId,
    type: option.type,
    name: title,
    data: option.seed(description),
    ...(position ? { position } : {}),
  }

  flow?.push(node)
  if (node.type === NODE_TYPE.DATE_TIME) flow?.push(...branchesFor(node))

  save()
  await delay(LATENCY_MS)
  return clone(node)
}

/**
 * @param {{ id: string, patch: { name?: string, parentId?: string, position?: { x: number, y: number }, data?: Record<string, any> } }} input
 * @returns {Promise<Record<string, any>>}
 */
export async function updateNode({ id, patch }) {
  await ensureLoaded()
  const node = requireNode(id)

  if (patch.name !== undefined) node.name = patch.name
  if (patch.parentId !== undefined) node.parentId = patch.parentId
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

  flow = withNodeRemoved(flow ?? [], id)
  save()
  await delay(LATENCY_MS)
  return { id }
}

/** Discard local changes and start again from the starter diagram. */
export async function restoreFlow() {
  resetFlow()
  return fetchFlow()
}

/**
 * Undo and redo. No latency: taking a change back should not make you wait.
 * @param {Record<string, any>[]} next
 * @returns {Promise<Record<string, any>[]>}
 */
export async function replaceFlow(next) {
  flow = clone(next)
  save()
  return clone(flow)
}
