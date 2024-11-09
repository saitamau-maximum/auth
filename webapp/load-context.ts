import { DrizzleD1Database } from 'drizzle-orm/d1'
import { type PlatformProxy } from 'wrangler'

import * as schema from './db/schema'

export interface Env {
  GITHUB_APP_ID: string
  GITHUB_APP_PRIVKEY: string
  GITHUB_OAUTH_ID: string
  GITHUB_OAUTH_SECRET: string
  SYMKEY: string
  PRIVKEY: string
  SESSION_SECRET: string
  CF_PAGES_URL: string
  DB: D1Database
}

export interface HonoEnv {
  Bindings: Env
  Variables: {
    dbClient: DrizzleD1Database<typeof schema>
  }
}

type Cloudflare = Omit<PlatformProxy<Env>, 'dispose'>

declare module '@remix-run/cloudflare' {
  interface AppLoadContext {
    cloudflare: Cloudflare
  }
}
