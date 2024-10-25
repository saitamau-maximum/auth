import type { ActionFunction, LoaderFunction } from '@remix-run/cloudflare'

import {
  importKey,
  generateToken,
  keypairProtectedHeader,
} from '@saitamau-maximum/auth/internal'
import { jwtVerify } from 'jose'

import pubkeyData from '../../data/pubkey.json'

export const action: ActionFunction = async ({ request, context }) => {
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return new Response('invalid request', { status: 400 })
  }

  interface PostData {
    name: string
    pubkey: string
    callback: string
    mac: string
  }
  const data = await request.json<PostData>()

  if (
    (['name', 'pubkey', 'callback', 'mac'] as const).some(
      key => !data[key] || typeof data[key] !== 'string',
    )
  ) {
    return new Response('invalid request', { status: 400 })
  }

  const registeredData = pubkeyData.find(
    regdata => regdata.name === data.name && regdata.pubkey === data.pubkey,
  )

  if (registeredData === undefined) {
    throw new Response('invalid request', { status: 400 })
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
    throw new Response('invalid request', { status: 400 })
  }

  const key = await importKey(context.cloudflare.env.SYMKEY, 'symmetric')
  const token = await generateToken({
    name: data.name,
    pubkey: data.pubkey,
    callback: data.callback,
    symkey: key,
  })

  return new Response(token, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}

export const loader: LoaderFunction = () =>
  new Response('method not allowed', { status: 405 })
