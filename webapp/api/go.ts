import { zValidator } from '@hono/zod-validator'
import { importKey, verifyToken } from '@saitamau-maximum/auth/internal'
import { Hono } from 'hono'
import { HonoEnv } from 'load-context'
import cookieSessionStorage from 'utils/session.server'
import { z } from 'zod'

const app = new Hono<HonoEnv>()

app.get(
  '/',
  zValidator(
    'query',
    z.object({
      name: z.string(),
      pubkey: z.string(),
      callback: z.string(),
      token: z.string(),
    }),
  ),
  async c => {
    const { name, pubkey, callback, token } = c.req.valid('query')

    // name, pubkey, callback の正当性は /token のほうでしている
    // 改ざんされたら token 自体が無効になるので、ここではチェックしない

    const key = await importKey(c.env.SYMKEY, 'symmetric')
    const [isvalid, message] = await verifyToken({
      name,
      pubkey,
      callback,
      symkey: key,
      token,
    })

    if (!isvalid) return c.text(message, 400)

    const { getSession, commitSession } = cookieSessionStorage(c.env)

    // ref: https://docs.github.com/ja/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
    const oauthUrl = new URL('https://github.com/login/oauth/authorize')
    const oauthParams = new URLSearchParams()
    oauthParams.set('client_id', c.env.GITHUB_OAUTH_ID)
    oauthParams.set('redirect_uri', `${c.env.CF_PAGES_URL}/cb`)
    oauthParams.set('scope', 'read:user')
    const state = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
    oauthParams.set('state', state)
    oauthParams.set('allow_signup', 'false')

    const session = await getSession(c.req.raw.headers.get('Cookie'))
    session.flash('continue_name', encodeURIComponent(name))
    session.flash('continue_to', callback)
    session.flash('state', state)

    c.header('Set-Cookie', await commitSession(session))
    return c.redirect(oauthUrl.toString() + '?' + oauthParams.toString(), 302)
  },
)

app.all('/', async c => {
  return c.text('method not allowed', 405)
})

export default app
