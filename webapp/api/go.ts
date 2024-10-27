import { importKey, verifyToken } from '@saitamau-maximum/auth/internal'
import { Hono } from 'hono'
import { validator } from 'hono/validator'
import cookieSessionStorage from 'utils/session.server'

import pubkeyData from '../data/pubkey.json'
import { Env } from '../load-context'

const app = new Hono<{ Bindings: Env }>()

app.get(
  '/',
  validator('query', (value, c) => {
    const { name, pubkey, callback, token } = value
    if (
      typeof name !== 'string' ||
      typeof pubkey !== 'string' ||
      typeof callback !== 'string' ||
      typeof token !== 'string'
    ) {
      return c.text('required query missing', 400)
    }
    if (!URL.canParse(callback)) {
      return c.text('invalid callback', 400)
    }

    const cbUrl = new URL(callback)
    if (
      (['username', 'password', 'search', 'hash'] as const).some(
        key => cbUrl[key] !== '',
      )
    ) {
      return c.text('cannot contain username, password, search, or hash', 400)
    }

    return { name, pubkey, callback, token }
  }),
  async c => {
    const { name, pubkey, callback, token } = c.req.valid('query')

    const registeredData = pubkeyData.find(
      regdata => regdata.name === name && regdata.pubkey === pubkey,
    )
    if (registeredData === undefined) {
      return c.text('data not found', 400)
    }

    try {
      await importKey(registeredData.pubkey, 'publicKey')
    } catch (_) {
      throw new Response('invalid pubkey', { status: 400 })
    }

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
