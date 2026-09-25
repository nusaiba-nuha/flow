import { Inject, Injectable } from '@nestjs/common'
import type pg from 'pg'

import { POOL } from '../database.js'

export interface DiagramRow {
  id: string
  text: string
  title: string
  editHash: string
  revision: number
  updatedAt: Date
}

/** The only code that speaks SQL. */
@Injectable()
export class DiagramsRepository {
  constructor(@Inject(POOL) private readonly pool: pg.Pool) {}

  async find(id: string): Promise<DiagramRow | null> {
    const { rows } = await this.pool.query(
      `SELECT id, text, title, edit_hash AS "editHash", revision, updated_at AS "updatedAt"
         FROM diagrams WHERE id = $1`,
      [id],
    )
    return rows[0] ?? null
  }

  async insert(row: { id: string; text: string; title: string; editHash: string }): Promise<void> {
    await this.pool.query(
      'INSERT INTO diagrams (id, text, title, edit_hash) VALUES ($1, $2, $3, $4)',
      [row.id, row.text, row.title, row.editHash],
    )
  }

  /** @returns the new revision */
  async update(id: string, text: string, title: string): Promise<number> {
    const { rows } = await this.pool.query(
      `UPDATE diagrams SET text = $2, title = $3, revision = revision + 1, updated_at = now()
        WHERE id = $1 RETURNING revision`,
      [id, text, title],
    )
    return rows[0].revision
  }

  async remove(id: string): Promise<void> {
    await this.pool.query('DELETE FROM diagrams WHERE id = $1', [id])
  }
}
