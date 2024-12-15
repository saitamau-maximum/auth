import { zValidator } from '@hono/zod-validator'
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
      continue_to: z.string().optional(),
    }),
  ),
  async c => {
    const { continue_to } = c.req.valid('query')

    const { getSession, commitSession } = cookieSessionStorage(c.env)
    const session = await getSession(c.req.raw.headers.get('Cookie'))
    session.flash('continue_to', continue_to || '/')
    c.header('Set-Cookie', await commitSession(session))

    // @sor4chi デザインたのんだ
    const responseHtml = `
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ログイン</title>
</head>
<body>
  <h1>ログイン</h1>
  <p>ログインしてください</p>
  <a href="/login/github">GitHub でログイン</a>
</body>
</html>
`
    return c.html(responseHtml)
  },
)

app.all('/', async c => {
  return c.text('method not allowed', 405)
})

export default app
