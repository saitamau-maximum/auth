import { Hono } from 'hono'

import { Env } from '../load-context'

import tokenRoute from './token'

const app = new Hono<{ Bindings: Env }>()

app.use(async (c, next) => {
  await next()
})
app.route('/token', tokenRoute)

export default app
