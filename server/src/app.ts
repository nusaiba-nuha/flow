import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import type pg from 'pg'

import { AppModule } from './app.module.js'
import type { Config } from './config.js'

/** The app, configured but not listening, so tests can start it on any port. */
export async function createApp(config: Config, pool: pg.Pool): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.with(config, pool), {
    logger: ['error', 'warn'],
    bodyParser: false,
  })
  // .flow text as it is, or JSON with a `text` field; nothing bigger than a diagram.
  app.useBodyParser('text', { type: ['text/plain', 'text/markdown'], limit: config.maxBytes * 2 })
  app.useBodyParser('json', { limit: config.maxBytes * 2 })
  app.enableCors({
    origin: config.corsOrigins.length ? config.corsOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
  app.disable('x-powered-by')
  return app
}
