import type { ActionFunction, LoaderFunction } from '@remix-run/cloudflare'

import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { encrypt, importKey } from '../../utils/keygen'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

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

  // TODO: 生成部分をファイル切り出し
  const now = dayjs.tz().valueOf()
  const tokenData = btoa(
    `user:${data.name}___pubkey:${data.pubkey}___time:${now}`,
  )

  const key = await importKey(context.cloudflare.env.SYMKEY, 'symmetric')

  const [token, iv] = await encrypt(new TextEncoder().encode(tokenData), key)

  return new Response(JSON.stringify({ token: btoa(token), iv: btoa(iv) }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const loader: LoaderFunction = () =>
  new Response('method not allowed', { status: 405 })
