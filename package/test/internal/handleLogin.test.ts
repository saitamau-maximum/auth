/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

// jsdom だと TextEncoder と Uint8Array の互換性がないみたいなので node でテストする (挙動は同じ...はず)
// https://github.com/vitest-dev/vitest/issues/4043
// @vitest-environment node

import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { handleLogin } from '../../src/internal/handleLogin'
import { importKey } from '../../src/internal/keygen'

import { cookieParser } from './cookieUtil'

const TEST_PUBKEY =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwiY3J2IjoiUC01MjEiLCJ4IjoiQWJpRUV5QTFGTVhmRklWN0p4c0hUVzJlQXNTX1llZ0hvQlp0R2xaaGRfSXZVSzJmay16RC14dEhmYUFESnFyNXViTEw2eWItTUtLZHktNUhvRnVSNEN1dSIsInkiOiJBZXRiLUhDY19IbGhScUYxT0pHUmlYMS15aWk5SUhzazFJT252dXF6OXlPVFlsOGpSLXNTNHpEaUd6ODBJWHJ2Qm1zTzVPRHZpYWxYN1E5enJ5MHFlS0lkIn0='

const TEST_PRIVKEY =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsic2lnbiJdLCJleHQiOnRydWUsImNydiI6IlAtNTIxIiwieCI6IkFiaUVFeUExRk1YZkZJVjdKeHNIVFcyZUFzU19ZZWdIb0JadEdsWmhkX0l2VUsyZmstekQteHRIZmFBREpxcjV1YkxMNnliLU1LS2R5LTVIb0Z1UjRDdXUiLCJ5IjoiQWV0Yi1IQ2NfSGxoUnFGMU9KR1JpWDEteWlpOUlIc2sxSU9udnVxejl5T1RZbDhqUi1zUzR6RGlHejgwSVhydkJtc081T0R2aWFsWDdROXpyeTBxZUtJZCIsImQiOiJBRjgtRHJSbmFabjhkRVppV2ozR2owY3F3VWlWNFp3NmhyX2EyT1FfbzMxQmVVNUc3RXhpQmV1dzcyemx5RVlCMGpXTWZKYUZzeUVhdU50UmFKY045cFJNIn0='

describe('required options missing', () => {
  it('throws when options.authName is not provided', async () => {
    const req = new Request('https://example.com')
    await expect(handleLogin(req, {} as any)).rejects.toThrow(
      'options.authName は必須です',
    )
  })

  it('throws when options.privateKey is not provided', async () => {
    const req = new Request('https://example.com')
    await expect(handleLogin(req, { authName: 'test' } as any)).rejects.toThrow(
      'options.privateKey は必須です',
    )
  })
})

describe('dev mode', () => {
  it('throws when served not by localhost', async () => {
    const req = new Request('https://example.com/')
    await expect(
      handleLogin(req, {
        authName: 'test',
        privateKey: 'test',
        dev: true,
      }),
    ).rejects.toThrow(
      'dev mode では localhost からのリクエストのみ受け付けます',
    )
  })

  it('returns HTML for dev mode login', async () => {
    const req = new Request('http://localhost/auth/login')
    const res = await handleLogin(req, {
      authName: 'test',
      privateKey: 'test',
      dev: true,
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html')
  })

  it("adds '__continue_to' cookie", async () => {
    const req = new Request('http://localhost/')
    const res = await handleLogin(req, {
      authName: 'test',
      privateKey: 'test',
      dev: true,
    })
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(cookie.has('__continue_to')).toBeTruthy()
    expect(cookie.get('__continue_to')![0]).toBe('http://localhost/')
  })

  it("redirects to '/auth/login'", async () => {
    const req = new Request('http://localhost/')
    const res = await handleLogin(req, {
      authName: 'test',
      privateKey: 'test',
      dev: true,
    })
    expect(res.status).toBe(302)
    expect(res.headers.has('Location')).toBeTruthy()
    expect(res.headers.get('Location')).toBe('/auth/login')
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
        if (
          path === 'https://auth.server.test/token' ||
          path === 'https://auth.maximum.vc/token'
        ) {
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
          expect(data.mac).toBeTypeOf('string')

          return new Response('DUMMY_TOKEN', {
            status: 200,
            headers: {
              'Content-Type': 'text/plain',
            },
          })
        }

        if (path === 'https://auth.server.test.dummy/token') {
          return new Response(null, { status: 500 })
        }

        console.error('unexpected fetch', path)
        return new Response(null, { status: 500 })
      })
  })

  afterEach(() => {
    mockedFetch.mockRestore()
  })

  it('throws if auth server error', async () => {
    const req = new Request('https://example.com/')
    const res = handleLogin(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
      authOrigin: 'https://auth.server.test.dummy',
    })
    await expect(res).rejects.toThrow('auth server error')
  })

  it("adds '__continue_to' cookie", async () => {
    const req = new Request('https://example.com/')
    const res = await handleLogin(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
      authOrigin: 'https://auth.server.test',
    })
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(cookie.has('__continue_to')).toBeTruthy()
    expect(cookie.get('__continue_to')![0]).toBe('https://example.com/')
  })

  it('returns 302', async () => {
    const req = new Request('https://example.com/')
    const res = await handleLogin(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
      authOrigin: 'https://auth.server.test',
    })
    expect(res.status).toBe(302)
  })

  it('redirects to correct path & params', async () => {
    const req = new Request('https://example.com/')
    const res = await handleLogin(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
      authOrigin: 'https://auth.server.test',
    })
    expect(res.headers.has('Location')).toBeTruthy()
    const location = new URL(res.headers.get('Location')!)
    expect(location.origin).toBe('https://auth.server.test')
    expect(location.pathname).toBe('/go')
    const params = location.searchParams
    expect(params.get('name')).toBe('test')

    // expect(params.get('pubkey')).toBe(TEST_PUBKEY)
    // derivePubkey で鍵の key の順番が違うせい？でうまくいかないので値として等しいかチェック
    expect(await importKey(TEST_PUBKEY, 'publicKey')).toEqual(
      await importKey(params.get('pubkey')!, 'publicKey'),
    )
    expect(params.get('callback')).toBe('https://example.com/auth/callback')
    expect(params.get('token')).toBe('DUMMY_TOKEN')
  })

  it('works if authOrigin is missing', async () => {
    const req = new Request('https://example.com/')
    const res = await handleLogin(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
    })
    expect(res.status).toBe(302)
  })
})
