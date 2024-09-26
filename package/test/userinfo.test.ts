/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { importKey, sign } from '../src/internal/keygen'
import { checkLoggedIn, getUserInfo } from '../src/userinfo'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

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

  it('throws when pubkey is not provided (checkLoggedIn)', async () => {
    const req = new Request('https://example.com', { method: 'GET' })
    await expect(checkLoggedIn(req, null)).rejects.toThrow(
      'publicKey が null です',
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
    expect(res).toHaveProperty('time')
    // 1ms 以内の誤差を許容
    expect(dayjs.tz().valueOf() - res!.time).toBeLessThan(1000)
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
        // webapp/app/routes/user.tsx
        if (
          path === 'https://auth.server.test/user' ||
          path === 'https://auth.maximum.vc/user'
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
          expect(data.data).toBeTypeOf('string')
          expect(data.iv).toBeTypeOf('string')
          expect(data.sgn1).toBeTypeOf('string')
          expect(data.sgn2).toBeTypeOf('string')
          expect(data.sgn3).toBeTypeOf('string')
          return new Response(
            JSON.stringify({
              id: '120705481',
              display_name: 'saitamau-maximum',
              is_member: true,
              profile_image:
                'https://avatars.githubusercontent.com/u/120705481?v=4',
              teams: ['leaders'],
              time: dayjs.tz().valueOf(),
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          )
        }

        if (path === 'https://auth.server.test2/user') {
          return new Response(
            JSON.stringify({
              id: '120705481',
              display_name: 'saitamau-maximum',
              is_member: false,
              profile_image:
                'https://avatars.githubusercontent.com/u/120705481?v=4',
              teams: ['leaders'],
              time: dayjs.tz().valueOf(),
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          )
        }

        if (path === 'https://auth.server.test.dummy/user') {
          return new Response('Server down', { status: 503 })
        }

        console.error('unexpected fetch', path)
        return new Response(null, { status: 500 })
      })
  })

  afterEach(() => {
    mockedFetch.mockRestore()
  })

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

    const req = new Request('http://localhost/auth/me', {
      headers: {
        Cookie: `__authdata=test;__iv=ivtest;__sign1=hoge;__sign2=${await sign('test', privkey)};__sign3=${await sign('ivtest', privkey)}`,
      },
    })
    const res = await getUserInfo(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
      authOrigin: 'https://auth.server.test',
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
    expect(res).toHaveProperty('time')
    // 1ms 以内の誤差を許容
    expect(dayjs.tz().valueOf() - res!.time).toBeLessThan(1000)
  })

  it('returns null when logged in as non-member', async () => {
    const privkey = await importKey(TEST_PRIVKEY, 'privateKey')

    const req = new Request('http://localhost/auth/me', {
      headers: {
        Cookie: `__authdata=test;__iv=ivtest;__sign1=hoge;__sign2=${await sign('test', privkey)};__sign3=${await sign('ivtest', privkey)}`,
      },
    })
    const res = await getUserInfo(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
      authOrigin: 'https://auth.server.test2',
    })
    expect(res).toBe(null)
  })

  it('returns null when fetch failed', async () => {
    const privkey = await importKey(TEST_PRIVKEY, 'privateKey')

    const req = new Request('http://localhost/auth/me', {
      headers: {
        Cookie: `__authdata=test;__iv=ivtest;__sign1=hoge;__sign2=${await sign('test', privkey)};__sign3=${await sign('ivtest', privkey)}`,
      },
    })
    const res = await getUserInfo(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
      authOrigin: 'https://auth.server.test.dummy',
    })
    expect(res).toBe(null)
  })

  it('works if authOrigin is missing', async () => {
    const privkey = await importKey(TEST_PRIVKEY, 'privateKey')

    const req = new Request('http://localhost/auth/me', {
      headers: {
        Cookie: `__authdata=test;__iv=ivtest;__sign1=hoge;__sign2=${await sign('test', privkey)};__sign3=${await sign('ivtest', privkey)}`,
      },
    })
    const res = await getUserInfo(req, {
      authName: 'test',
      privateKey: TEST_PRIVKEY,
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
    expect(res).toHaveProperty('time')
    // 1ms 以内の誤差を許容
    expect(dayjs.tz().valueOf() - res!.time).toBeLessThan(1000)
  })
})
