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
  name: string[],
  pubkey: string[],
  callback: string[],
  time: number[],
  key: CryptoKey,
) => {
  const param = new URLSearchParams()
  for (const n of name) param.append('user', n)
  for (const p of pubkey) param.append('pubkey', p)
  for (const c of callback) param.append('callback', c)
  for (const t of time) param.append('time', String(t))
  const tokenData = btoa(param.toString())
  return await encrypt(tokenData, key)
}

describe('basic generate & verify', () => {
  it('generates a token', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await generateToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
    )
    expect(token).toBeTypeOf('string')
    expect(iv).toBeTypeOf('string')
  })

  it('can verify a token', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await generateToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
    )
    const [result, message] = await verifyToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
      token,
      iv,
    )
    expect(result).toBe(true)
    expect(message).toBe('valid token')
  })

  it('can verify an invalid token', async () => {
    const key = await generateSymmetricKey()
    const [result, message] = await verifyToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
      'invalid',
      'invalid',
    )
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('can verify an expired token', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await generateToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
    )
    await new Promise(resolve => setTimeout(resolve, 11000))
    const [result, message] = await verifyToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
      token,
      iv,
    )
    expect(result).toBe(false)
    expect(message).toBe('token expired')
  }, 20000)
})

describe('data verification (user)', () => {
  it('user lack', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      [],
      ['test'],
      ['http://foo.bar/'],
      [1234567890123],
      key,
    )
    const [result, message] = await verifyToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
      token,
      iv,
    )
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('many user', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      ['test1', 'test2'],
      ['test'],
      ['http://foo.bar/'],
      [1234567890123],
      key,
    )
    const [result, message] = await verifyToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
      token,
      iv,
    )
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('user mismatch', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      ['test1'],
      ['test'],
      ['http://foo.bar/'],
      [1234567890123],
      key,
    )
    const [result, message] = await verifyToken(
      'test2',
      'test',
      'http://foo.bar/',
      key,
      token,
      iv,
    )
    expect(result).toBe(false)
    expect(message).toBe('user mismatch')
  })
})

describe('data verification (pubkey)', () => {
  it('pubkey lack', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      ['test'],
      [],
      ['http://foo.bar/'],
      [1234567890123],
      key,
    )
    const [result, message] = await verifyToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
      token,
      iv,
    )
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('many pubkey', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      ['test'],
      ['test1', 'test2'],
      ['http://foo.bar/'],
      [1234567890123],
      key,
    )
    const [result, message] = await verifyToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
      token,
      iv,
    )
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('pubkey mismatch', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      ['test'],
      ['test1'],
      ['http://foo.bar/'],
      [1234567890123],
      key,
    )
    const [result, message] = await verifyToken(
      'test',
      'test2',
      'http://foo.bar/',
      key,
      token,
      iv,
    )
    expect(result).toBe(false)
    expect(message).toBe('pubkey mismatch')
  })
})

describe('data verification (callback)', () => {
  it('callback lack', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      ['test'],
      ['test'],
      [],
      [1234567890123],
      key,
    )
    const [result, message] = await verifyToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
      token,
      iv,
    )
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('many callback', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      ['test'],
      ['test'],
      ['http://foo.bar/', 'http://foo.baz/'],
      [1234567890123],
      key,
    )
    const [result, message] = await verifyToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
      token,
      iv,
    )
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('callback mismatch', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      ['test'],
      ['test'],
      ['http://foo.bar/'],
      [1234567890123],
      key,
    )
    const [result, message] = await verifyToken(
      'test',
      'test',
      'http://foo.baz/',
      key,
      token,
      iv,
    )
    expect(result).toBe(false)
    expect(message).toBe('callback mismatch')
  })
})

describe('data verification (time)', () => {
  it('time lack', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      ['test'],
      ['test'],
      ['http://foo.bar/'],
      [],
      key,
    )
    const [result, message] = await verifyToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
      token,
      iv,
    )
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('many time', async () => {
    const key = await generateSymmetricKey()
    const [token, iv] = await tokenGenForTest(
      ['test'],
      ['test'],
      ['http://foo.bar/'],
      [1234567890123, 1234567890124],
      key,
    )
    const [result, message] = await verifyToken(
      'test',
      'test',
      'http://foo.bar/',
      key,
      token,
      iv,
    )
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })
})
