import { type PlatformProxy } from 'wrangler'

interface Env {
  GITHUB_APP_ID: string
  GITHUB_APP_PRIVKEY: string
  GITHUB_OAUTH_ID: string
  GITHUB_OAUTH_SECRET: string
  SYMKEY: string
  PRIVKEY: string
  SESSION_SECRET: string
  CF_PAGES_URL: string
  db: D1Database
}

type Cloudflare = Omit<PlatformProxy<Env>, 'dispose'>

declare module '@remix-run/cloudflare' {
  interface AppLoadContext {
    cloudflare: Cloudflare
  }
}
