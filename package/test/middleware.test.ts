/* eslint-disable @typescript-eslint/no-non-null-assertion */

// jsdom だと TextEncoder と Uint8Array の互換性がないみたいなので node でテストする (挙動は同じ...はず)
// https://github.com/vitest-dev/vitest/issues/4043
// @vitest-environment node

import { SignJWT } from 'jose'
import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { importKey, keypairProtectedHeader } from '../src/internal'
import { middleware } from '../src/middleware'

const TEST_PRIVKEY =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsic2lnbiJdLCJleHQiOnRydWUsImNydiI6IlAtNTIxIiwieCI6IkFmRVhoOTY5VTRxMUo3RDNZQlBpMFY2ODlPdUFaOVJGZS1STHRhSFE4QmUwTEQ2LWQ5dlJ1ZEFFMnlHTE10Z0lMX1drekhSRF9TNjg2M1BkUUZKLTJydnEiLCJ5IjoiQUtpZ0Ftd2FPcF9Vd3V2NXZqOEE4UXFjS2Z3WG42enZNUHU3QWhOdkFDdE5qdC1UdTBvRWg3d0Z5dGJDR3FNaFRYMm01SEJnZlZhbTh5aTRMWkRiSWlYcCIsImQiOiJBVVJnWGpLazBtaDlsbDdtVDZvRDJTT09TZEF1bWpITFQtOU1pZnRsd1VNOGpiTlNRMkJxOVlBemNvVkZRRmV5VzEzbVNzY3dUT0dUbTRxZ1QwWDJnV1VmIn0='

describe('required options missing', () => {
  it('throws when AUTH_NAME is not provided', async () => {
    await expect(
      middleware({
        env: {
          PRIVKEY: 'test',
        },
      }),
    ).rejects.toThrow('context.env.AUTH_NAME は必須です')
  })

  it('throws when PRIVKEY is not provided', async () => {
    await expect(
      middleware({
        env: {
          AUTH_NAME: 'test',
        },
      }),
    ).rejects.toThrow('context.env.PRIVKEY は必須です')
  })
})

describe('common', () => {
  // 各処理についてはそれぞれのテストで行っているため、ここではURLのみを確認する
  it("defines route '/auth/callback'", async () => {
    const res = await middleware({
      env: {
        AUTH_NAME: 'test',
        PRIVKEY: TEST_PRIVKEY,
      },
      request: {
        url: 'http://localhost/auth/callback',
      },
    })
    expect(res.status).not.toBe(404)
  })

  it("defines route '/auth/logout'", async () => {
    const res = await middleware({
      env: {
        AUTH_NAME: 'test',
        PRIVKEY: TEST_PRIVKEY,
      },
      request: {
        url: 'http://localhost/auth/logout',
      },
    })
    expect(res.status).not.toBe(404)
  })

  it("defines route '/auth/me'", async () => {
    const res = await middleware({
      env: {
        AUTH_NAME: 'test',
        PRIVKEY: TEST_PRIVKEY,
      },
      request: {
        url: 'http://localhost/auth/me',
        headers: new Headers(),
      },
    })
    expect(res.status).not.toBe(404)
  })

  it("returns 404 for '/auth/*'", async () => {
    const res = await middleware({
      env: {
        AUTH_NAME: 'test',
        PRIVKEY: TEST_PRIVKEY,
      },
      request: {
        url: 'http://localhost/auth/hoge',
      },
    })
    expect(res.status).toBe(404)
  })
})

describe('dev mode', () => {
  it("defines route '/auth/login'", async () => {
    const res = await middleware({
      env: {
        AUTH_NAME: 'test',
        PRIVKEY: TEST_PRIVKEY,
        IS_DEV: 'true',
      },
      request: {
        url: 'http://localhost/auth/login',
      },
    })
    expect(res.status).not.toBe(404)
  })

  it('redirects to login when not logged in', async () => {
    const res = await middleware({
      env: {
        AUTH_NAME: 'test',
        PRIVKEY: TEST_PRIVKEY,
        IS_DEV: 'true',
      },
      request: {
        url: 'http://localhost/',
        headers: new Headers(),
      },
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/auth/login')
  })

  it('executes next() when logged in', async () => {
    const res = await middleware({
      env: {
        AUTH_NAME: 'test',
        PRIVKEY: TEST_PRIVKEY,
        IS_DEV: 'true',
      },
      request: {
        url: 'http://localhost/',
        headers: new Headers({
          cookie: '__dev_logged_in=true',
        }),
      },
      next: async () => {
        return new Response(null, { status: 200 })
      },
    })
    expect(res.status).toBe(200)
  })
})

describe('prod mode', () => {
  let mockedFetch: MockInstance<
    [input: string | Request | URL, init?: RequestInit | undefined],
    Promise<Response>
  >

  beforeEach(() => {
    mockedFetch = vi
      .spyOn(global, 'fetch')
      .mockImplementation(async (path, options) => {
        // webapp/app/routes/token.tsx
        if (path === 'https://auth.server.test/token') {
          expect(options).toBeTruthy()
          expect(options!.method).toBe('POST')
          expect(options!.headers).toBeTruthy()
          const headers = new Headers(options!.headers)
          expect(headers.get('content-type')).toBeTruthy()
          expect(
            headers.get('content-type')!.includes('application/json'),
          ).toBeTruthy()
          expect(options!.body).toBeTruthy()
          await expect(
            new Promise((resolve, reject) => {
              try {
                JSON.parse(options!.body as string)
                resolve(true)
              } catch (e) {
                reject(e)
              }
            }),
          ).resolves.toBeTruthy()
          const data = JSON.parse(options!.body as string)
          expect(data.name).toBeTypeOf('string')
          expect(data.pubkey).toBeTypeOf('string')
          expect(data.callback).toBeTypeOf('string')
          return new Response('DUMMY_TOKEN', {
            status: 200,
            headers: {
              'Content-Type': 'text/plain',
            },
          })
        }

        console.error('unexpected fetch', path)
        return new Response(null, { status: 500 })
      })
  })

  afterEach(() => {
    mockedFetch.mockRestore()
  })

  it("returns 404 for '/auth/login'", async () => {
    const res = await middleware({
      env: {
        AUTH_NAME: 'test',
        PRIVKEY: TEST_PRIVKEY,
      },
      request: {
        url: 'http://localhost/auth/login',
      },
    })
    expect(res.status).toBe(404)
  })

  it('redirects to login when not logged in', async () => {
    const res = await middleware({
      env: {
        AUTH_NAME: 'test',
        PRIVKEY: TEST_PRIVKEY,
        AUTH_DOMAIN: 'https://auth.server.test',
      },
      request: {
        url: 'http://localhost/',
        headers: new Headers(),
      },
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('https://auth.server.test/go')
  })

  it('executes next() when logged in', async () => {
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

    const res = await middleware({
      env: {
        AUTH_NAME: 'test',
        PRIVKEY: TEST_PRIVKEY,
        AUTH_DOMAIN: 'https://auth.server.test',
      },
      request: {
        url: 'http://localhost/',
        headers: new Headers({
          cookie: `token=${token}`,
        }),
      },
      next: async () => {
        return new Response(null, { status: 200 })
      },
    })
    expect(res.status).toBe(200)
  })
})
