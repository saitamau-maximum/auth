import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { HonoEnv } from 'load-context'

import * as schema from '../db/schema'

import cbRoute from './cb'
import goRoute from './go'
import oauthAuthorizeRoute from './oauth/authorize'
import oauthCallbackRoute from './oauth/callback'
import tokenRoute from './token'

const app = new Hono<HonoEnv>()

app.use(secureHeaders())

// 使い方をそのまま: https://github.com/yusukebe/hono-remix-adapter/blob/main/README.md
// Remix の Route になかったら Hono の Route を探すみたいなことしてそう
app.use(async (c, next) => {
  await next()
})

app.use(async (c, next) => {
  const dbClient = drizzle(c.env.DB, { schema })
  c.set('dbClient', dbClient)

  await next()
})

app.route('/token', tokenRoute)
app.route('/go', goRoute)
app.route('/cb', cbRoute)
app.route('/oauth/authorize', oauthAuthorizeRoute)
app.route('/oauth/callback', oauthCallbackRoute)

export default app
