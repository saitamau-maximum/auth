import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import * as schema from '../db/schema'
import { HonoEnv } from '../load-context'
import { IdpRepository } from '../repository/idp'

import cbRoute from './cb'
import goRoute from './go'
import loginRoute from './login'
import oauthRoute from './oauth'
import tokenRoute from './token'

const app = new Hono<HonoEnv>()

app.use(secureHeaders())

// 使い方をそのまま: https://github.com/yusukebe/hono-remix-adapter/blob/main/README.md
// Remix の Route になかったら Hono の Route を探すみたいなことしてそう
app.use(async (c, next) => {
  await next()
})

app.use(async (c, next) => {
  const dbClient = drizzle(c.env.AUTH_DB, { schema })
  c.set('dbClient', dbClient)
  c.set('idpClient', new IdpRepository(c.env.IDP_DB))

  await next()
})

app.route('/token', tokenRoute)
app.route('/go', goRoute)
app.route('/cb', cbRoute)
app.route('/login', loginRoute)
app.route('/oauth', oauthRoute)

export default app
