import type { ActionFunction, LoaderFunction } from '@remix-run/cloudflare'

import { importKey, generateToken } from '@saitamau-maximum/auth/internal'

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
  }
  const data = await request.json<PostData>()

  if (
    (['name', 'pubkey', 'callback'] as const).some(
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

  const key = await importKey(context.cloudflare.env.SYMKEY, 'symmetric')
  const [token, iv] = await generateToken(
    data.name,
    data.pubkey,
    data.callback,
    key,
  )

  return new Response(JSON.stringify({ token: btoa(token), iv: btoa(iv) }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const loader: LoaderFunction = () =>
  new Response('method not allowed', { status: 405 })
