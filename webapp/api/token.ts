import { zValidator } from '@hono/zod-validator'
import {
  importKey,
  generateToken,
  keypairProtectedHeader,
} from '@saitamau-maximum/auth/internal'
import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { jwtVerify } from 'jose'
import { HonoEnv } from 'load-context'
import { z } from 'zod'

import pubkeyData from '../data/pubkey.json'

const app = new Hono<HonoEnv>()

app.post(
  '/',
  validator('header', (value, c) => {
    if (value['content-type']?.toLowerCase() !== 'application/json') {
      return c.text('body must be application/json', 400)
    }
    return value
  }),
  zValidator(
    'json',
    z.object({
      name: z.string(),
      pubkey: z.string(),
      callback: z.string().url(),
      mac: z.string(),
    }),
  ),
  async c => {
    const { name, pubkey, callback, mac } = c.req.valid('json')

    const cbUrl = new URL(callback)
    if (
      (['username', 'password', 'search', 'hash'] as const).some(
        key => cbUrl[key] !== '',
      )
    ) {
      return c.text('cannot contain username, password, search, or hash', 400)
    }

    const registeredData = pubkeyData.find(
      regdata => regdata.name === name && regdata.pubkey === pubkey,
    )

    if (registeredData === undefined) {
      return c.text('data not found', 400)
    }

    const { payload } = await jwtVerify<{ callback: string }>(
      mac,
      await importKey(registeredData.pubkey, 'publicKey'),
      {
        algorithms: [keypairProtectedHeader.alg],
        audience: 'maximum-auth',
        clockTolerance: 5,
        issuer: registeredData.name,
        subject: 'Maximum Auth Token',
      },
    ).catch(() => ({ payload: null }))
    if (!payload || payload.callback !== callback) {
      return c.text('invalid mac', 400)
    }

    const key = await importKey(c.env.SYMKEY, 'symmetric')
    const token = await generateToken({
      name,
      pubkey,
      callback,
      symkey: key,
    })

    return c.text(token, 200)
  },
)

app.all('/', async c => {
  return c.text('method not allowed', 405)
})

export default app
