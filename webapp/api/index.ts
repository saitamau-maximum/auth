import { Hono } from 'hono'

const app = new Hono()

app.use(async (ctx, next) => {
  await next()
})

app.get('/cb', ctx => {
  return ctx.json({ message: 'Hello from Hono!' })
})

export default app
