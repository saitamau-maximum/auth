/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

// jsdom だと TextEncoder と Uint8Array の互換性がないみたいなので node でテストする (挙動は同じ...はず)
// https://github.com/vitest-dev/vitest/issues/4043
// @vitest-environment node

import { jwtVerify, SignJWT } from 'jose'
import { describe, expect, it, vi } from 'vitest'

import { handleCallback } from '../../src/internal/handleCallback'
import {
  exportKey,
  generateKeyPair,
  importKey,
  keypairProtectedHeader,
} from '../../src/internal/keygen'

import { cookieParser, removesCookie } from './cookieUtil'

vi.mock('../../src/internal/const', async importOriginal => {
  const mod = await importOriginal<typeof import('../../src/internal/const')>()
  return {
    ...mod,
    AUTH_PUBKEY:
      'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwiY3J2IjoiUC01MjEiLCJ4IjoiQUF1elRiR0JDRFhlemwtbVRPNHp4aXFRRGFKNzZwZDlJQVdidHY2RVk3dVlLSU1nMWFaZXI3azZadGxJZVZWaktZMzFBaGZwN1NYV3RYd1JQVlltWkI0NSIsInkiOiJBY1U2Ykh5dUxPdFZnR0hNQldzUTJEbGtWdzVneVVXY0VSNk01aTJBYmFoM0VkVi1sRnRtZXdhdHNyUVZMV1E0NDFFQTFpRFB6QWF0bG1obFJKdUM0NnZUIn0=',
  }
})

const TEST_AUTHPRIVKEY =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsic2lnbiJdLCJleHQiOnRydWUsImNydiI6IlAtNTIxIiwieCI6IkFBdXpUYkdCQ0RYZXpsLW1UTzR6eGlxUURhSjc2cGQ5SUFXYnR2NkVZN3VZS0lNZzFhWmVyN2s2WnRsSWVWVmpLWTMxQWhmcDdTWFd0WHdSUFZZbVpCNDUiLCJ5IjoiQWNVNmJIeXVMT3RWZ0dITUJXc1EyRGxrVnc1Z3lVV2NFUjZNNWkyQWJhaDNFZFYtbEZ0bWV3YXRzclFWTFdRNDQxRUExaURQekFhdGxtaGxSSnVDNDZ2VCIsImQiOiJBZE5pV2tjT3lGV0Z6akYxMTVmaDhkWlBPTWIzSVk1Rk84Z2l3NTh3NWRzSTFkRlRPd1JFaWdBWUJEWEZGNXlVajZMLUlvN3dBMkxRNU9RWkREaC02MFl3In0='

const TEST_PUBKEY =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwiY3J2IjoiUC01MjEiLCJ4IjoiQWZFWGg5NjlVNHExSjdEM1lCUGkwVjY4OU91QVo5UkZlLVJMdGFIUThCZTBMRDYtZDl2UnVkQUUyeUdMTXRnSUxfV2t6SFJEX1M2ODYzUGRRRkotMnJ2cSIsInkiOiJBS2lnQW13YU9wX1V3dXY1dmo4QThRcWNLZndYbjZ6dk1QdTdBaE52QUN0Tmp0LVR1MG9FaDd3Rnl0YkNHcU1oVFgybTVIQmdmVmFtOHlpNExaRGJJaVhwIn0='

const TEST_PRIVKEY =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsic2lnbiJdLCJleHQiOnRydWUsImNydiI6IlAtNTIxIiwieCI6IkFmRVhoOTY5VTRxMUo3RDNZQlBpMFY2ODlPdUFaOVJGZS1STHRhSFE4QmUwTEQ2LWQ5dlJ1ZEFFMnlHTE10Z0lMX1drekhSRF9TNjg2M1BkUUZKLTJydnEiLCJ5IjoiQUtpZ0Ftd2FPcF9Vd3V2NXZqOEE4UXFjS2Z3WG42enZNUHU3QWhOdkFDdE5qdC1UdTBvRWg3d0Z5dGJDR3FNaFRYMm01SEJnZlZhbTh5aTRMWkRiSWlYcCIsImQiOiJBVVJnWGpLazBtaDlsbDdtVDZvRDJTT09TZEF1bWpITFQtOU1pZnRsd1VNOGpiTlNRMkJxOVlBemNvVkZRRmV5VzEzbVNzY3dUT0dUbTRxZ1QwWDJnV1VmIn0='

const generateJWT = async ({
  privateKey,
  subject = 'Maximum Auth Data',
  audience = 'test',
  issuer = 'maximum-auth',
  exp = '1 day',
  ...payload
}: {
  privateKey: CryptoKey
  subject?: string
  audience?: string
  issuer?: string
  exp?: string
  [key: string]: unknown
}) => {
  let jwt = new SignJWT(payload).setNotBefore('0 sec').setIssuedAt()
  if (subject) jwt = jwt.setSubject(subject)
  if (audience) jwt = jwt.setAudience(audience)
  if (issuer) jwt = jwt.setIssuer(issuer)
  if (exp) jwt = jwt.setExpirationTime(exp)
  return await jwt.setProtectedHeader(keypairProtectedHeader).sign(privateKey)
}

describe('required options missing', () => {
  it('throws when options.authName is not provided', async () => {
    const req = new Request('https://example.com', { method: 'GET' })
    await expect(handleCallback(req, {} as any)).rejects.toThrow(
      'options.authName は必須です',
    )
  })

  it('throws when options.privateKey is not provided', async () => {
    const req = new Request('https://example.com', { method: 'GET' })
    await expect(
      handleCallback(req, { authName: 'test' } as any),
    ).rejects.toThrow('options.privateKey は必須です')
  })
})

describe('callback cancel', () => {
  it('returns 401', async () => {
    const req = new Request('https://example.com/auth/callback?cancel=true', {
      method: 'GET',
    })
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: 'test',
    })
    expect(res).toHaveProperty('status', 401)
  })

  it('returns HTML', async () => {
    const req = new Request('https://example.com/auth/callback?cancel=true', {
      method: 'GET',
    })
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: 'test',
    })
    expect(res.headers.has('Content-Type')).toBeTruthy()
  })

  it("removes '__continue_to' cookie", async () => {
    const req = new Request('https://example.com/auth/callback?cancel=true', {
      method: 'GET',
    })
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: 'test',
    })
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(removesCookie(cookie, '__continue_to')).toBeTruthy()
  })
})

describe('dev mode', () => {
  it('throws when served not by localhost', async () => {
    const req = new Request('https://example.com/auth/callback', {
      method: 'GET',
    })
    await expect(
      handleCallback(req, {
        authName: 'test',
        privateKey: 'test',
        dev: true,
      }),
    ).rejects.toThrow(
      'dev mode では localhost からのリクエストのみ受け付けます',
    )
  })

  it('returns 400 when cookie is not set', async () => {
    const req = new Request('http://localhost/auth/callback', {
      method: 'GET',
    })
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: 'test',
      dev: true,
    })
    expect(res).toHaveProperty('status', 400)
  })

  it("removes '__continue_to' cookie", async () => {
    const req = new Request('http://localhost/auth/callback', {
      method: 'GET',
      headers: {
        Cookie: '__continue_to=http://localhost/',
      },
    })
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: 'test',
      dev: true,
    })
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(removesCookie(cookie, '__continue_to')).toBeTruthy()
  })

  it("adds '__dev_logged_in' cookie", async () => {
    const req = new Request('http://localhost/auth/callback', {
      method: 'GET',
      headers: {
        Cookie: '__continue_to=http://localhost/',
      },
    })
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: 'test',
      dev: true,
    })
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(cookie.has('__dev_logged_in')).toBeTruthy()
    expect(cookie.get('__dev_logged_in')![0]).toBe('true')
  })

  it("redirects to '__continue_to'", async () => {
    const req = new Request('http://localhost/auth/callback', {
      method: 'GET',
      headers: {
        Cookie: '__continue_to=http://localhost/hoge',
      },
    })
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: 'test',
      dev: true,
    })
    expect(res.status).toBe(302)
    expect(res.headers.has('Location')).toBeTruthy()
    expect(res.headers.get('Location')).toBe('http://localhost/hoge')
  })

  it("redirects to root when '__continue_to' is not set", async () => {
    const req = new Request('http://localhost/auth/callback', {
      method: 'GET',
      headers: {
        Cookie: 'foo=bar',
      },
    })
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: 'test',
      dev: true,
    })
    expect(res.status).toBe(302)
    expect(res.headers.has('Location')).toBeTruthy()
    expect(res.headers.get('Location')).toBe('/')
  })
})

describe('prod mode', () => {
  it('returns 400 when token is missing', async () => {
    const req = new Request('http://localhost/auth/callback?', {
      method: 'GET',
      headers: {
        Cookie: '__continue_to=http://localhost/',
      },
    })
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: 'test',
    })
    expect(res).toHaveProperty('status', 400)
  })

  it('returns 400 when cookie is not set', async () => {
    const param = new URLSearchParams()
    param.set('token', 'test')
    const req = new Request(
      'http://localhost/auth/callback?' + param.toString(),
      {
        method: 'GET',
      },
    )
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: 'test',
    })
    expect(res).toHaveProperty('status', 400)
  })

  it('returns 400 when audience is not authname', async () => {
    const authPrivkey = await importKey(TEST_AUTHPRIVKEY, 'privateKey')
    const token = await generateJWT({
      privateKey: authPrivkey,
      audience: 'test1',
    })

    const param = new URLSearchParams()
    param.set('token', token)

    const req = new Request(
      'http://localhost/auth/callback?' + param.toString(),
      {
        method: 'GET',
        headers: {
          Cookie: '__continue_to=http://localhost/',
        },
      },
    )
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: TEST_AUTHPRIVKEY,
    })
    expect(res).toHaveProperty('status', 400)
  })

  it('returns 400 when issuer is not "maximum-auth"', async () => {
    const authPrivkey = await importKey(TEST_AUTHPRIVKEY, 'privateKey')
    const token = await generateJWT({
      privateKey: authPrivkey,
      issuer: 'test',
    })

    const param = new URLSearchParams()
    param.set('token', token)

    const req = new Request(
      'http://localhost/auth/callback?' + param.toString(),
      {
        method: 'GET',
        headers: {
          Cookie: '__continue_to=http://localhost/',
        },
      },
    )
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: TEST_AUTHPRIVKEY,
    })
    expect(res).toHaveProperty('status', 400)
  })

  it('returns 400 when subject is not "Maximum Auth Data"', async () => {
    const authPrivkey = await importKey(TEST_AUTHPRIVKEY, 'privateKey')
    const token = await generateJWT({
      privateKey: authPrivkey,
      subject: 'test',
    })

    const param = new URLSearchParams()
    param.set('token', token)

    const req = new Request(
      'http://localhost/auth/callback?' + param.toString(),
      {
        method: 'GET',
        headers: {
          Cookie: '__continue_to=http://localhost/',
        },
      },
    )
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: TEST_AUTHPRIVKEY,
    })
    expect(res).toHaveProperty('status', 400)
  })

  it('returns 400 when token is expired', async () => {
    const authPrivkey = await importKey(TEST_AUTHPRIVKEY, 'privateKey')
    const token = await generateJWT({
      privateKey: authPrivkey,
      exp: '1 sec',
    })

    const param = new URLSearchParams()
    param.set('token', token)

    // 5 sec の tolerance 考慮
    await new Promise(resolve => setTimeout(resolve, 7000))

    const req = new Request(
      'http://localhost/auth/callback?' + param.toString(),
      {
        method: 'GET',
        headers: {
          Cookie: '__continue_to=http://localhost/',
        },
      },
    )
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: TEST_AUTHPRIVKEY,
    })
    expect(res).toHaveProperty('status', 400)
  }, 19000)

  it('uses options.authPubkey if set', async () => {
    const { privateKey, publicKey } = await generateKeyPair()
    const token = await generateJWT({ privateKey })

    const param = new URLSearchParams()
    param.set('token', token)

    const req = new Request(
      'http://localhost/auth/callback?' + param.toString(),
      {
        method: 'GET',
        headers: {
          Cookie: '__continue_to=http://localhost/',
        },
      },
    )
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
      authPubkey: await exportKey(publicKey),
    })
    expect(res).toHaveProperty('status', 302)
  })

  it("removes '__continue_to' cookie", async () => {
    const authPrivkey = await importKey(TEST_AUTHPRIVKEY, 'privateKey')
    const token = await generateJWT({ privateKey: authPrivkey })

    const param = new URLSearchParams()
    param.set('token', token)

    const req = new Request(
      'http://localhost/auth/callback?' + param.toString(),
      {
        method: 'GET',
        headers: {
          Cookie: '__continue_to=http://localhost/',
        },
      },
    )
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
    })
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(removesCookie(cookie, '__continue_to')).toBeTruthy()
  })

  it("adds 'token' cookie", async () => {
    const authPrivkey = await importKey(TEST_AUTHPRIVKEY, 'privateKey')

    const payload = { hoge: 'fuga' }
    const token = await generateJWT({ privateKey: authPrivkey, ...payload })

    const param = new URLSearchParams()
    param.set('token', token)

    const req = new Request(
      'http://localhost/auth/callback?' + param.toString(),
      {
        method: 'GET',
        headers: {
          Cookie: '__continue_to=http://localhost/',
        },
      },
    )
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
    })
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(cookie.has('token')).toBeTruthy()

    const pubkey = await importKey(TEST_PUBKEY, 'publicKey')
    const jwt = cookie.get('token')![0]
    const { payload: resPayload } = await jwtVerify(jwt, pubkey, {
      algorithms: [keypairProtectedHeader.alg],
      audience: 'test',
      clockTolerance: 5,
      issuer: 'test',
      subject: 'Maximum Auth Data',
    }).catch(() => ({ payload: null }))

    // jwt 用のプロパティ (iat, exp) などが追加されているので、 deepEqual は使わない
    expect(resPayload).not.toBeNull()
    for (const key in payload) {
      expect(resPayload).toHaveProperty(key)
      expect(resPayload![key]).toBe(payload[key])
    }
  })

  it("redirects to '__continue_to'", async () => {
    const authPrivkey = await importKey(TEST_AUTHPRIVKEY, 'privateKey')
    const token = await generateJWT({ privateKey: authPrivkey })

    const param = new URLSearchParams()
    param.set('token', token)

    const req = new Request(
      'http://localhost/auth/callback?' + param.toString(),
      {
        method: 'GET',
        headers: {
          Cookie: '__continue_to=http://localhost/hoge',
        },
      },
    )
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
    })
    expect(res.headers.has('Location')).toBeTruthy()
    expect(res.headers.get('Location')).toBe('http://localhost/hoge')
  })

  it("redirects to root when '__continue_to' is not set", async () => {
    const authPrivkey = await importKey(TEST_AUTHPRIVKEY, 'privateKey')
    const token = await generateJWT({ privateKey: authPrivkey })

    const param = new URLSearchParams()
    param.set('token', token)

    const req = new Request(
      'http://localhost/auth/callback?' + param.toString(),
      {
        method: 'GET',
        headers: {
          Cookie: 'foo=bar',
        },
      },
    )
    const res = await handleCallback(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
    })
    expect(res.headers.has('Location')).toBeTruthy()
    expect(res.headers.get('Location')).toBe('/')
  })
})
