import {
  importKey,
  generateToken,
  keypairProtectedHeader,
} from '@saitamau-maximum/auth/internal'
import { Hono } from 'hono'
import { jwtVerify } from 'jose'

import pubkeyData from '../data/pubkey.json'
import { Env } from '../load-context'

const app = new Hono<{ Bindings: Env }>()

app.use(async (c, next) => {
  await next()
})
app.all('/token', async c => {
  if (c.req.method !== 'POST') {
    return c.text('method not allowed', 405)
  }

  if (c.req.header('content-type')?.toLowerCase() !== 'application/json') {
    return c.text('body must be application/json', 400)
  }

  interface PostData {
    name: string
    pubkey: string
    callback: string
    mac: string
  }

  let data: PostData
  try {
    data = await c.req.json<PostData>()
  } catch (_) {
    return c.text('body is not a valid JSON object', 400)
  }

  if (
    (['name', 'pubkey', 'callback', 'mac'] as const).some(
      key => !data[key] || typeof data[key] !== 'string',
    )
  ) {
    return c.text('required field missing', 400)
  }

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

  return c.text(token, 200, {
    'Content-Type': 'text/plain',
  })
})

export default app
