import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { importKey, PROXY_PUBKEY, verify } from './internal'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

interface Options {
  proxyPubkey?: string
}

const validateRequest = async (header: Headers, options?: Options) => {
  const proxyPubkey = options?.proxyPubkey || PROXY_PUBKEY

  if (
    [
      'X-Maximum-Auth-Pubkey',
      'X-Maximum-Auth-Time',
      'X-Maximum-Auth-Key',
      'X-Maximum-Auth-Mac',
    ].some(key => !header.has(key))
  ) {
    return false
  }

  if (proxyPubkey !== header.get('X-Maximum-Auth-Pubkey')) {
    return false
  }

  const time = dayjs.tz(parseInt(header.get('X-Maximum-Auth-Time')!))
  const now = dayjs.tz()

  // 一応時計のずれも考慮しておく
  if (Math.abs(now.diff(time, 'second')) > 15) {
    return false
  }

  const pubkey = await importKey(proxyPubkey, 'publicKey')

  return await verify(
    `${header.get('X-Maximum-Auth-Time')!}___${header.get('X-Maximum-Auth-Key')!}`,
    header.get('X-Maximum-Auth-Mac')!,
    pubkey,
  )
}

export { validateRequest }
