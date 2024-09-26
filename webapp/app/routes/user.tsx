/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { ActionFunction, LoaderFunction } from '@remix-run/cloudflare'

import {
  importKey,
  derivePublicKey,
  verify,
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

  interface PostData {
    name: string
    pubkey: string
    data: string
    iv: string
    sgn1: string // Our hash
    sgn2: string // Their data hash
    sgn3: string // Their iv hash
  }
  const data = await request.json<PostData>()

  if (
    (['name', 'pubkey', 'data', 'iv', 'sgn1', 'sgn2', 'sgn3'] as const).some(
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

  const ourPrivkey = await importKey(
    context.cloudflare.env.PRIVKEY,
    'privateKey',
  )
  const ourPubkey = await derivePublicKey(ourPrivkey)
  const theirPubkey = await importKey(registeredData.pubkey, 'publicKey')

  if (
    !(await verify(data.data!, data.sgn1!, ourPubkey)) ||
    !(await verify(data.data!, data.sgn2!, theirPubkey)) ||
    !(await verify(data.iv!, data.sgn3!, theirPubkey))
  ) {
    throw new Response('invalid request', { status: 400 })
  }

  const symkey = await importKey(context.cloudflare.env.SYMKEY, 'symmetric')

  return new Response(await decrypt(data.data!, symkey, data.iv!), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const loader: LoaderFunction = () =>
  new Response('method not allowed', { status: 405 })
