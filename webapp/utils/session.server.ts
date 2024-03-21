import type { AppLoadContext } from '@remix-run/cloudflare'
import { createCookieSessionStorage } from '@remix-run/cloudflare'

interface SessionData {
  id: string
  display_name: string
  profile_image: string
  teams: string[]
  is_member: boolean
}

interface SessionFlashData {
  state: string
  continue_to: string
  continue_name: string
}

const cookieSessionStorage = (envvar: AppLoadContext['cloudflare']['env']) =>
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: '__session',
      secure: envvar.CF_PAGES_URL.startsWith('https://'), // ローカルでの開発時は false
      sameSite: 'lax',
      path: '/',
      httpOnly: true,
      secrets: [envvar.SESSION_SECRET],
      maxAge: 60 * 60 * 24, // 1 日
    },
  })

export default cookieSessionStorage
