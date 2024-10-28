import { Hono } from 'hono'

import { Env } from '../load-context'

import cbRoute from './cb'
import goRoute from './go'
import tokenRoute from './token'

const app = new Hono<{ Bindings: Env }>()

app.use(async (c, next) => {
  await next()
})

app.route('/token', tokenRoute)
app.route('/go', goRoute)
app.route('/cb', cbRoute)

export default app
