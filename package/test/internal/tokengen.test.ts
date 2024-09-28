// jsdom だと TextEncoder と Uint8Array の互換性がないみたいなので node でテストする (挙動は同じ...はず)
// https://github.com/vitest-dev/vitest/issues/4043
// @vitest-environment node

import { EncryptJWT } from 'jose'
import { describe, expect, it } from 'vitest'

import {
  generateSymmetricKey,
  symmetricProtectedHeader,
} from '../../src/internal/keygen'
import { generateToken, verifyToken } from '../../src/internal/tokengen'

const tokenGenForTest = async ({
  subject,
  audience,
  issuer,
  key,
  ...payload
}: {
  name?: string | string[]
  pubkey?: string | string[]
  callback?: string | string[]
  subject?: string
  audience?: string
  issuer?: string
  key: CryptoKey
}) => {
  let res = new EncryptJWT(payload)
  if (subject) res = res.setSubject(subject)
  if (audience) res = res.setAudience(audience)
  if (issuer) res = res.setIssuer(issuer)
  return res
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(symmetricProtectedHeader)
    .encrypt(key)
}

describe('basic generate & verify', () => {
  it('generates a token', async () => {
    const key = await generateSymmetricKey()
    const token = await generateToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
    })
    expect(token).toBeTypeOf('string')
  })

  it('can verify a token', async () => {
    const key = await generateSymmetricKey()
    const token = await generateToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(true)
    expect(message).toBe('valid token')
  })

  it('can verify an invalid token', async () => {
    const key = await generateSymmetricKey()
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: 'invalid',
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('can verify an expired token', async () => {
    const key = await generateSymmetricKey()
    const token = await generateToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
    })
    await new Promise(resolve => setTimeout(resolve, 20000))
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  }, 25000)
})

describe('data verification (user)', () => {
  it('user lack', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      name: [],
      pubkey: ['test'],
      callback: ['http://foo.bar/'],
      key,
      audience: 'maximum-auth',
      issuer: 'maximum-auth',
      subject: 'Maximum Auth Token',
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('many user', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      name: ['test1', 'test2'],
      pubkey: ['test'],
      callback: ['http://foo.bar/'],
      key,
      audience: 'maximum-auth',
      issuer: 'maximum-auth',
      subject: 'Maximum Auth Token',
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('user not provided', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      name: ['test'],
      pubkey: ['test'],
      callback: ['http://foo.bar/'],
      key,
      audience: 'maximum-auth',
      issuer: 'maximum-auth',
      subject: 'Maximum Auth Token',
    })
    const [result, message] = await verifyToken({
      name: null,
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid request')
  })

  it('user mismatch', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      name: 'test1',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      key,
      audience: 'maximum-auth',
      issuer: 'maximum-auth',
      subject: 'Maximum Auth Token',
    })
    const [result, message] = await verifyToken({
      name: 'test2',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })
})

describe('data verification (pubkey)', () => {
  it('pubkey lack', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      name: ['test'],
      pubkey: [],
      callback: ['http://foo.bar/'],
      key,
      audience: 'maximum-auth',
      issuer: 'maximum-auth',
      subject: 'Maximum Auth Token',
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('many pubkey', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      name: ['test'],
      pubkey: ['test1', 'test2'],
      callback: ['http://foo.bar/'],
      key,
      audience: 'maximum-auth',
      issuer: 'maximum-auth',
      subject: 'Maximum Auth Token',
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('pubkey not provided', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      key,
      audience: 'maximum-auth',
      issuer: 'maximum-auth',
      subject: 'Maximum Auth Token',
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: null,
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid request')
  })

  it('pubkey mismatch', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      name: 'test',
      pubkey: 'test1',
      callback: 'http://foo.bar/',
      key,
      audience: 'maximum-auth',
      issuer: 'maximum-auth',
      subject: 'Maximum Auth Token',
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test2',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })
})

describe('data verification (callback)', () => {
  it('callback lack', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      name: ['test'],
      pubkey: ['test'],
      callback: [],
      key,
      audience: 'maximum-auth',
      issuer: 'maximum-auth',
      subject: 'Maximum Auth Token',
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('many callback', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      name: ['test'],
      pubkey: ['test'],
      callback: ['http://foo.bar/', 'http://foo.baz/'],
      key,
      audience: 'maximum-auth',
      issuer: 'maximum-auth',
      subject: 'Maximum Auth Token',
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('callback not provided', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.baz/',
      key,
      audience: 'maximum-auth',
      issuer: 'maximum-auth',
      subject: 'Maximum Auth Token',
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: null,
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid request')
  })

  it('callback mismatch', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      key,
      audience: 'maximum-auth',
      issuer: 'maximum-auth',
      subject: 'Maximum Auth Token',
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.baz/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })
})

describe('data verification (subject)', () => {
  const payload = {
    name: 'test',
    pubkey: 'test',
    callback: 'http://foo.bar/',
  }

  it('subject lack', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      ...payload,
      issuer: 'maximum-auth',
      audience: 'maximum-auth',
      key,
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('subject mismatch', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      ...payload,
      subject: 'test',
      issuer: 'maximum-auth',
      audience: 'maximum-auth',
      key,
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })
})

describe('data verification (audience)', () => {
  const payload = {
    name: 'test',
    pubkey: 'test',
    callback: 'http://foo.bar/',
  }

  it('audience lack', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      ...payload,
      subject: 'Maximum Auth Token',
      issuer: 'maximum-auth',
      key,
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('audience mismatch', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      ...payload,
      subject: 'Maximum Auth Token',
      issuer: 'maximum-auth',
      audience: 'test',
      key,
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })
})

describe('data verification (issuer)', () => {
  const payload = {
    name: 'test',
    pubkey: 'test',
    callback: 'http://foo.bar/',
  }

  it('issuer lack', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      ...payload,
      subject: 'Maximum Auth Token',
      audience: 'maximum-auth',
      key,
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })

  it('issuer mismatch', async () => {
    const key = await generateSymmetricKey()
    const token = await tokenGenForTest({
      ...payload,
      subject: 'Maximum Auth Token',
      audience: 'maximum-auth',
      issuer: 'test',
      key,
    })
    const [result, message] = await verifyToken({
      name: 'test',
      pubkey: 'test',
      callback: 'http://foo.bar/',
      symkey: key,
      token: token,
    })
    expect(result).toBe(false)
    expect(message).toBe('invalid token')
  })
})
