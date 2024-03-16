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
  key: CryptoKey,
) => {
  const now = dayjs.tz().valueOf()
  const tokenData = btoa(`user:${name}___pubkey:${pubkey}___time:${now}`)
  return await encrypt(new TextEncoder().encode(tokenData), key)
}

export const verifyToken = async (
  name: string,
  pubkey: string,
  key: CryptoKey,
  token: string,
  iv: string,
): Promise<[boolean, string]> => {
  let decrypted: ArrayBuffer
  try {
    decrypted = await decrypt(token, key, iv)
  } catch (e) {
    return [false, 'invalid token']
  }
  const tokenData = atob(new TextDecoder().decode(decrypted))
  const data = tokenData.split('___')

  if (
    data.filter(d => d.includes('user:')).length !== 1 ||
    data.filter(d => d.includes('pubkey:')).length !== 1 ||
    data.filter(d => d.includes('time:')).length !== 1
  )
    return [false, 'invalid token']

  const user = data.find(d => d.includes('user:'))?.split(':')[1]
  if (user !== name) return [false, 'user mismatch']

  const pubkeyData = data.find(d => d.includes('pubkey:'))?.split(':')[1]
  if (pubkeyData !== pubkey) return [false, 'pubkey mismatch']

  const time = data.find(d => d.includes('time:'))?.split(':')[1]
  if (dayjs.tz().diff(dayjs.tz(Number(time)), 'millisecond') > 10000)
    return [false, 'token expired']

  return [true, 'valid token']
}
