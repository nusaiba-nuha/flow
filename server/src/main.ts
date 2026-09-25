import { createApp } from './app.js'
import { readConfig } from './config.js'
import { openPool } from './database.js'

const config = readConfig()
const pool = await openPool(config.databaseUrl)
const app = await createApp(config, pool)
await app.listen(config.port)
console.log(`isketch server on ${config.publicUrl}`)
