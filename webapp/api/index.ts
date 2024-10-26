import {
  importKey,
  generateToken,
  keypairProtectedHeader,
} from '@saitamau-maximum/auth/internal'
import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { jwtVerify } from 'jose'

import pubkeyData from '../data/pubkey.json'
import { Env } from '../load-context'

const app = new Hono<{ Bindings: Env }>()

app.use(async (c, next) => {
  await next()
})

app.all(
  '/token',
  validator('json', (value, c) => {
    interface PostData {
      name: string
      pubkey: string
      callback: string
      mac: string
    }
    const res: PostData = {
      name: '',
      pubkey: '',
      callback: '',
      mac: '',
    }
    if (
      Object.keys(res).some(
        key => !value[key] || typeof value[key] !== 'string',
      )
    ) {
      return c.text('invalid request', 400)
    }
    // 不要なデータを削除するために再構築
    for (const key of Object.keys(res) as (keyof PostData)[]) {
      res[key] = value[key] as string
    }
    return res
  }),
  async c => {
    if (c.req.method !== 'POST') {
      return c.text('method not allowed', 405)
    }

    if (!c.req.header('content-type')?.includes('application/json')) {
      return c.text('invalid request', 400)
    }

    const data = c.req.valid('json')

    const registeredData = pubkeyData.find(
      regdata => regdata.name === data.name && regdata.pubkey === data.pubkey,
    )

    if (registeredData === undefined) {
      return c.text('invalid request', 400)
    }

    const { payload } = await jwtVerify<{ callback: string }>(
      data.mac,
      await importKey(registeredData.pubkey, 'publicKey'),
      {
        algorithms: [keypairProtectedHeader.alg],
        audience: 'maximum-auth',
        clockTolerance: 5,
        issuer: registeredData.name,
        subject: 'Maximum Auth Token',
      },
    ).catch(() => ({ payload: null }))
    if (!payload || payload.callback !== data.callback) {
      return c.text('invalid request', 400)
    }

    const key = await importKey(c.env.SYMKEY, 'symmetric')
    const token = await generateToken({
      name: data.name,
      pubkey: data.pubkey,
      callback: data.callback,
      symkey: key,
    })

    return c.text(token, 200, {
      'Content-Type': 'text/plain',
    })
  },
)

export default app
