import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { describe, expect, it } from 'vitest'

import { generateSymmetricKey, encrypt } from '../src/keygen'
import { generateToken, verifyToken } from '../src/tokengen'
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

const tokenGenForTest = async (
  name: string | undefined,
  pubkey: string | undefined,
  includeTime: boolean,
  key: CryptoKey,
) => {
  const now = dayjs.tz().valueOf()
  const tokenData = btoa(
    [
      name && `user:${name}`,
      pubkey && `pubkey:${pubkey}`,
      includeTime && `time:${now}`,
    ].join('___'),
  )
  return await encrypt(new TextEncoder().encode(tokenData), key)
}

describe('basic generate & verify', () => {
  it('generates a token', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await generateToken('test', 'test', key)
    expect(token).toBeTypeOf('string')
    expect(iv).toBeTypeOf('string')
  })

  it('can verify a token', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await generateToken('test', 'test', key)
    const [result, message] = await verifyToken('test', 'test', key, token, iv)
    expect(result).toBe(true)
    expect(message).toBe('valid token')
  })

  it('can verify an invalid token', async () => {
    const key = await generateSymmetricKey()
    const [result, message] = await verifyToken(
      'test',
      'test',
      key,
      'invalid',
      'invalid',
    )
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('can verify an expired token', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await generateToken('test', 'test', key)
    await new Promise(resolve => setTimeout(resolve, 11000))
    const [result, message] = await verifyToken('test', 'test', key, token, iv)
    expect(result).toBe(false)
    expect(message).toBe('token expired')
  }, 20000)
})

describe('data verification (user)', () => {
  it('user lack', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(undefined, 'test', true, key)
    const [result, message] = await verifyToken('test', 'test', key, token, iv)
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('many user', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      'test1___user:test',
      'test',
      true,
      key,
    )
    const [result, message] = await verifyToken('test', 'test', key, token, iv)
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('user mismatch', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest('test1', 'test', true, key)
    const [result, message] = await verifyToken('test2', 'test', key, token, iv)
    expect(result).toBe(false)
    expect(message).toBe('user mismatch')
  })
})

describe('data verification (pubkey)', () => {
  it('pubkey lack', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest('test', undefined, true, key)
    const [result, message] = await verifyToken('test', 'test', key, token, iv)
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('many pubkey', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      'test',
      'test1___pubkey:test',
      true,
      key,
    )
    const [result, message] = await verifyToken('test', 'test', key, token, iv)
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('pubkey mismatch', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest('test', 'test1', true, key)
    const [result, message] = await verifyToken('test', 'test2', key, token, iv)
    expect(result).toBe(false)
    expect(message).toBe('pubkey mismatch')
  })
})

describe('data verification (time)', () => {
  it('time lack', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest('test', 'test', false, key)
    const [result, message] = await verifyToken('test', 'test', key, token, iv)
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('many time', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      'test1___time:1234567890123',
      'test',
      true,
      key,
    )
    const [result, message] = await verifyToken('test', 'test', key, token, iv)
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })
})
