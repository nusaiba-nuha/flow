import { readFile } from 'node:fs/promises'

import pg from 'pg'

export const POOL = Symbol('pool')

/** A pool, with the schema brought up to date before the first request. */
export async function openPool(databaseUrl: string): Promise<pg.Pool> {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 })
  const schema = await readFile(
    new URL('../../migrations/001_diagrams.sql', import.meta.url),
    'utf8',
  )
  await pool.query(schema)
  return pool
}
