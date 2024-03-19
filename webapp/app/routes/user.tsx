import type { ActionFunction, LoaderFunction } from '@remix-run/cloudflare'

import {
  importKey,
  derivePublicKey,
  verify as verifySign,
  decrypt,
} from '@saitamau-maximum/auth/internal'

import pubkeyData from '../../data/pubkey.json'

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
    data?: string
    iv?: string
    sgn1?: string // Our hash
    sgn2?: string // Their hash
  }
  const data = await request.json<MaybePostData>()

  if (
    !data.name ||
    !data.pubkey ||
    !data.data ||
    !data.iv ||
    !data.sgn1 ||
    !data.sgn2 ||
    typeof data.name !== 'string' ||
    typeof data.pubkey !== 'string' ||
    typeof data.data !== 'string' ||
    typeof data.iv !== 'string' ||
    typeof data.sgn1 !== 'string' ||
    typeof data.sgn2 !== 'string'
  ) {
    return new Response('invalid request', { status: 400 })
  }

  const registeredData = pubkeyData.find(
    regdata => regdata.name === data.name && regdata.pubkey === data.pubkey,
  )

  if (registeredData === undefined) {
    throw new Response('invalid request', { status: 400 })
  }

  const ourPrivkey = await importKey(
    context.cloudflare.env.PRIVKEY,
    'privateKey',
  )
  const ourPubkey = await derivePublicKey(ourPrivkey)
  const theirPubkey = await importKey(registeredData.pubkey, 'publicKey')

  if (
    !(await verifySign(data.data, data.sgn1, ourPubkey)) ||
    !(await verifySign(data.data, data.sgn2, theirPubkey))
  ) {
    throw new Response('invalid request', { status: 400 })
  }

  const symkey = await importKey(context.cloudflare.env.SYMKEY, 'symmetric')

  return new Response(await decrypt(data.data, symkey, data.iv), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const loader: LoaderFunction = () =>
  new Response('method not allowed', { status: 405 })
