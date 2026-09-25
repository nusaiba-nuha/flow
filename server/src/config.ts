/** Everything the server reads from its environment, read once. */
export interface Config {
  port: number
  databaseUrl: string
  /** Where links point, such as https://isketch.online */
  publicUrl: string
  /** The app, for "Open in isketch" links */
  appUrl: string
  /** Origins allowed to publish from a browser */
  corsOrigins: string[]
  /** The largest diagram accepted, in bytes */
  maxBytes: number
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT ?? 3000)
  const publicUrl = (env.PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/+$/, '')
  return {
    port,
    databaseUrl: env.DATABASE_URL ?? 'postgres://localhost:5432/isketch',
    publicUrl,
    appUrl: (env.APP_URL ?? publicUrl).replace(/\/+$/, ''),
    corsOrigins: (env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    maxBytes: Number(env.MAX_BYTES ?? 256 * 1024),
  }
}

export const CONFIG = Symbol('config')
