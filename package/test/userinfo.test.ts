/* eslint-disable @typescript-eslint/no-explicit-any */

// jsdom だと TextEncoder と Uint8Array の互換性がないみたいなので node でテストする (挙動は同じ...はず)
// https://github.com/vitest-dev/vitest/issues/4043
// @vitest-environment node

import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'

import { importKey, keypairProtectedHeader } from '../src/internal/keygen'
import { getUserInfo } from '../src/userinfo'

const TEST_PRIVKEY =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsic2lnbiJdLCJleHQiOnRydWUsImNydiI6IlAtNTIxIiwieCI6IkFmRVhoOTY5VTRxMUo3RDNZQlBpMFY2ODlPdUFaOVJGZS1STHRhSFE4QmUwTEQ2LWQ5dlJ1ZEFFMnlHTE10Z0lMX1drekhSRF9TNjg2M1BkUUZKLTJydnEiLCJ5IjoiQUtpZ0Ftd2FPcF9Vd3V2NXZqOEE4UXFjS2Z3WG42enZNUHU3QWhOdkFDdE5qdC1UdTBvRWg3d0Z5dGJDR3FNaFRYMm01SEJnZlZhbTh5aTRMWkRiSWlYcCIsImQiOiJBVVJnWGpLazBtaDlsbDdtVDZvRDJTT09TZEF1bWpITFQtOU1pZnRsd1VNOGpiTlNRMkJxOVlBemNvVkZRRmV5VzEzbVNzY3dUT0dUbTRxZ1QwWDJnV1VmIn0='

describe('required options missing', () => {
  it('throws when options.authName is not provided', async () => {
    const req = new Request('https://example.com', { method: 'GET' })
    await expect(getUserInfo(req, {} as any)).rejects.toThrow(
      'options.authName は必須です',
    )
  })

  it('throws when options.privateKey is not provided', async () => {
    const req = new Request('https://example.com', { method: 'GET' })
    await expect(getUserInfo(req, { authName: 'test' } as any)).rejects.toThrow(
      'options.privateKey は必須です',
    )
  })
})

describe('dev mode', () => {
  it('returns null when not logged in', async () => {
    const req = new Request('http://localhost/auth/me')
    const res = await getUserInfo(req, {
      authName: 'test',
      privateKey: 'test',
      dev: true,
    })
    expect(res).toBe(null)
  })

  it('returns dummy data when logged in', async () => {
    const req = new Request('http://localhost/auth/me', {
      headers: {
        Cookie: '__dev_logged_in=true',
      },
    })
    const res = await getUserInfo(req, {
      authName: 'test',
      privateKey: 'test',
      dev: true,
    })
    expect(res).not.toBe(null)
    expect(res).toHaveProperty('id', '120705481')
    expect(res).toHaveProperty('display_name', 'saitamau-maximum')
    expect(res).toHaveProperty('is_member', true)
    expect(res).toHaveProperty(
      'profile_image',
      'https://avatars.githubusercontent.com/u/120705481?v=4',
    )
    expect(res).toHaveProperty('teams', ['leaders'])
  })
})

describe('prod mode', () => {
  it('returns null when not logged in', async () => {
    const req = new Request('http://localhost/auth/me')
    const res = await getUserInfo(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
    })
    expect(res).toBe(null)
  })

  it("returns null with '__dev_logged_in' cookie", async () => {
    const req = new Request('http://localhost/auth/me', {
      headers: {
        Cookie: '__dev_logged_in=true',
      },
    })
    const res = await getUserInfo(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
    })
    expect(res).toBe(null)
  })

  it('returns data when logged in', async () => {
    const privkey = await importKey(TEST_PRIVKEY, 'privateKey')
    const payload = { hoge: 'fuga' }
    const token = await new SignJWT(payload)
      .setSubject('Maximum Auth Data')
      .setAudience('test')
      .setIssuer('test')
      .setNotBefore('0 sec')
      .setIssuedAt()
      .setExpirationTime('1 sec')
      .setProtectedHeader(keypairProtectedHeader)
      .sign(privkey)

    const req = new Request('http://localhost/auth/me', {
      headers: {
        Cookie: `token=${token}`,
      },
    })
    const res = await getUserInfo(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
      authOrigin: 'https://auth.server.test',
    })
    expect(res).not.toBe(null)
    expect(res).toHaveProperty('hoge', 'fuga')
  })
})
