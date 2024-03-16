import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { decrypt, encrypt } from './keygen'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

export const generateToken = async (
  name: string,
  pubkey: string,
  callback: string,
  key: CryptoKey,
) => {
  const now = dayjs.tz().valueOf()
  const param = new URLSearchParams()
  param.set('user', name)
  param.set('pubkey', pubkey)
  param.set('callback', callback)
  param.set('time', String(now))
  const tokenData = btoa(param.toString())
  return await encrypt(tokenData, key)
}

export const verifyToken = async (
  name: string,
  pubkey: string,
  callback: string,
  key: CryptoKey,
  token: string,
  iv: string,
): Promise<[boolean, string]> => {
  let decrypted: string
  try {
    decrypted = await decrypt(token, key, iv)
  } catch (e) {
    return [false, 'invalid token']
  }
  const tokenData = atob(decrypted)
  const data = new URLSearchParams(tokenData)

  if (
    data.getAll('user').length !== 1 ||
    data.getAll('pubkey').length !== 1 ||
    data.getAll('callback').length !== 1 ||
    data.getAll('time').length !== 1
  )
    return [false, 'invalid token']

  const user = data.get('user')
  if (user !== name) return [false, 'user mismatch']

  const pubkeyData = data.get('pubkey')
  if (pubkeyData !== pubkey) return [false, 'pubkey mismatch']

  const callbackData = data.get('callback')
  if (callbackData !== callback) return [false, 'callback mismatch']

  const time = data.get('time')
  if (dayjs.tz().diff(dayjs.tz(Number(time)), 'millisecond') > 10000)
    return [false, 'token expired']

  return [true, 'valid token']
}
