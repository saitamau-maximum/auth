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

app.post(
  '/',
  validator('header', (value, c) => {
    if (value['content-type']?.toLowerCase() !== 'application/json') {
      return c.text('body must be application/json', 400)
    }
    return value
  }),
  validator('json', (value, c) => {
    if (
      (['name', 'pubkey', 'callback', 'mac'] as const).some(
        key => !value[key] || typeof value[key] !== 'string',
      )
    ) {
      return c.text('required field missing', 400)
    }

    const name = value['name'] as string
    const pubkey = value['pubkey'] as string
    const callback = value['callback'] as string
    const mac = value['mac'] as string

    if (!URL.canParse(callback)) {
      return c.text('invalid callback', 400)
    }

    const cbUrl = new URL(callback)
    if (
      (['username', 'password', 'search', 'hash'] as const).some(
        key => cbUrl[key] !== '',
      )
    ) {
      return c.text('cannot contain username, password, search, or hash', 400)
    }

    return { name, pubkey, callback, mac }
  }),
  async c => {
    const data = c.req.valid('json')

    const registeredData = pubkeyData.find(
      regdata => regdata.name === data.name && regdata.pubkey === data.pubkey,
    )

    if (registeredData === undefined) {
      return c.text('data not found', 400)
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
      return c.text('invalid mac', 400)
    }

    const key = await importKey(c.env.SYMKEY, 'symmetric')
    const token = await generateToken({
      name: data.name,
      pubkey: data.pubkey,
      callback: data.callback,
      symkey: key,
    })

    return c.text(token, 200)
  },
)

app.all('/', async c => {
  return c.text('method not allowed', 405)
})

export default app
