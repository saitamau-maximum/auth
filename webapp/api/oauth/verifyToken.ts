import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { HonoEnv } from 'load-context'
import { z } from 'zod'

const app = new Hono<HonoEnv>()

// 仕様はここ参照: https://github.com/saitamau-maximum/auth/issues/43

type ResponseType =
  | {
      valid: true
      client: {
        id: string
        name: string
        description: string | null
        logo_url: string | null
        owner_id: string
      }
      user_id: string
      expires_at: number
      scopes: string[]
    }
  | {
      valid: false
      client: null
      user_id: null
      expires_at: null
      scopes: null
    }

const INVALID_REQUEST_RESPONSE: ResponseType = {
  valid: false,
  client: null,
  user_id: null,
  expires_at: null,
  scopes: null,
}

app.post(
  '/',
  zValidator(
    'form',
    z.object({
      access_token: z.string(),
    }),
    async (res, c) => {
      if (!res.success) return c.json(INVALID_REQUEST_RESPONSE, 400)
    },
  ),
  async c => {
    const { access_token } = c.req.valid('form')

    const nowUnixMs = Date.now()
    const nowDate = new Date(nowUnixMs)

    const tokenInfo = await c.var.dbClient.query.token.findFirst({
      where: (token, { eq, and, gt }) =>
        and(
          eq(token.access_token, access_token),
          gt(token.code_expires_at, nowDate),
        ),
      with: {
        client: true,
        scopes: {
          with: {
            scope: true,
          },
        },
      },
    })

    c.header('Cache-Control', 'no-store')
    c.header('Pragma', 'no-cache')

    // Token が見つからない場合
    if (!tokenInfo) {
      return c.json(INVALID_REQUEST_RESPONSE, 404)
    }

    return c.json<ResponseType>(
      {
        valid: true,
        client: tokenInfo.client,
        user_id: tokenInfo.user_id,
        expires_at: tokenInfo.access_token_expires_at.getTime(),
        scopes: tokenInfo.scopes.map(s => s.scope.name),
      },
      200,
    )
  },
)

// POST 以外は許容しない
app.all('/', async c => {
  return c.text('method not allowed', 405)
})

export default app
