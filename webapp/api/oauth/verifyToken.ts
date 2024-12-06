import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { HonoEnv } from 'load-context'
import { IUserInfo } from 'repository/idp'
import { z } from 'zod'

const app = new Hono<HonoEnv>()

// 仕様はここ参照: https://github.com/saitamau-maximum/auth/issues/43

interface ValidResponseType {
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
  user_info?: IUserInfo
}

interface InvalidResponseType {
  valid: false
  client: null
  user_id: null
  expires_at: null
  scopes: null
}

const INVALID_REQUEST_RESPONSE: InvalidResponseType = {
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
      if (!res.success)
        return c.json<InvalidResponseType>(INVALID_REQUEST_RESPONSE, 400)
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
      return c.json<InvalidResponseType>(INVALID_REQUEST_RESPONSE, 404)
    }

    const res: ValidResponseType = {
      valid: true,
      client: tokenInfo.client,
      user_id: tokenInfo.user_id,
      expires_at: tokenInfo.access_token_expires_at.getTime(),
      scopes: tokenInfo.scopes.map(s => s.scope.name),
    }

    if (res.scopes.includes('read:basic_info')) {
      const user = await c.var.idpClient.findUserById(res.user_id)
      if (user) res.user_info = user
    }

    return c.json<ValidResponseType>(res)
  },
)

// POST 以外は許容しない
app.all('/', async c => {
  return c.text('method not allowed', 405)
})

export default app
