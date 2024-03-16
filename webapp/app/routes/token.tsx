import type { ActionFunction, LoaderFunction } from '@remix-run/cloudflare'

import { importKey } from '../../utils/keygen'
import { generateToken } from '../../utils/tokengen'

export const action: ActionFunction = async ({ request, context }) => {
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return new Response('invalid request', { status: 400 })
  }

  interface MaybePostData {
    name?: string
    pubkey?: string
  }
  const data = await request.json<MaybePostData>()

  if (
    !data.name ||
    !data.pubkey ||
    typeof data.name !== 'string' ||
    typeof data.pubkey !== 'string'
  ) {
    return new Response('invalid request', { status: 400 })
  }

  const key = await importKey(context.cloudflare.env.SYMKEY, 'symmetric')
  const [token, iv] = await generateToken(data.name, data.pubkey, key)

  return new Response(JSON.stringify({ token: btoa(token), iv: btoa(iv) }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const loader: LoaderFunction = () =>
  new Response('method not allowed', { status: 405 })
