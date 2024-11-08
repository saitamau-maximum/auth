import { zValidator } from '@hono/zod-validator'
import { derivePublicKey, importKey } from '@saitamau-maximum/auth/internal'
import { Hono } from 'hono'
import { HonoEnv } from 'load-context'
import { validateAuthToken } from 'utils/auth-token.server'
import { z } from 'zod'

const app = new Hono<HonoEnv>()

// 仕様はここ参照: https://github.com/saitamau-maximum/auth/issues/29

app.post(
  '/',
  zValidator(
    'form',
    z.object({
      client_id: z.string(),
      redirect_uri: z.string().url(),
      state: z.string().optional(),
      scope: z
        .string()
        .regex(
          /^[\x21|\x23-\x5B|\x5D-\x7E]+(?:\x20+[\x21|\x23-\x5B|\x5D-\x7E]+)*$/,
        )
        .optional(),
      time: z.string().regex(/^\d+$/),
      auth_token: z.string().base64(),
      authorized: z.literal('1').or(z.literal('0')),
    }),
    async (res, c) => {
      // TODO: いい感じのエラー画面を作るかも
      if (!res.success) return c.text('Bad Request: invalid parameters', 400)
    },
  ),
  async (c, next) => {
    // TODO: ログインしているかチェック
    return next()
  },
  async c => {
    const {
      auth_token,
      authorized,
      client_id,
      redirect_uri,
      time: _time,
      scope,
      state,
    } = c.req.valid('form')
    const time = parseInt(_time, 10)
    const nowUnixMs = Date.now()

    const publicKey = await derivePublicKey(
      await importKey(c.env.PRIVKEY, 'privateKey'),
    )
    const isValidToken = await validateAuthToken({
      clientId: client_id,
      redirectUri: redirect_uri,
      scope: scope || '',
      state: state || '',
      time,
      key: publicKey,
      hash: auth_token,
    })

    c.header('Cache-Control', 'no-store')
    c.header('Pragma', 'no-cache')

    if (!isValidToken) {
      return c.text('Bad Request: invalid auth_token', 400)
    }

    // タイムリミットは 5 min
    if (time + 5 * 60 * 1000 > nowUnixMs) {
      // TODO: 5 min 以内に承認してくださいみたいなメッセージ追加すべき？
      return c.text('Bad Request: authorization request expired', 400)
    }

    const redirectTo = new URL(redirect_uri)
    redirectTo.searchParams.append('state', state || '')
    if (authorized === '0') {
      redirectTo.searchParams.append('error', 'access_denied')
      redirectTo.searchParams.append(
        'error_description',
        'The user denied the request',
      )
      // redirectTo.searchParams.append('error_uri', '') // そのうち書きたいね
      return c.redirect(redirectTo.href, 302)
    }
    // todo
    // return c.redirect(redirectTo.href, 302)
    return c.text('ok')
  },
)

// POST 以外は許容しない
app.all('/', async c => {
  return c.text('method not allowed', 405)
})

export default app
