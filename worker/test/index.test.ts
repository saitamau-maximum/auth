/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import worker from '../src/index'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

const TEST_AUTHPUBKEY =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwiY3J2IjoiUC01MjEiLCJ4IjoiQVB0MUFSd253eU82WGZEcWFNNFU2SGRRSnlDTUdnUk5wQkwxSXdjdmRfdVRNc3NqMmRCT3VDakFKQ1BRc2VFdVl5blZXdXN6Yi1UM2REQ29ROTlyeVo2NSIsInkiOiJBRjZHd19weTRrZ0xzRUQ2bHlWOVlEd0tTZm1saHQtUHFqSjZ2cXZxZlNmRnhHVG9VR3ZGOHk0OVByclowS3dlM213MFB1cFRHQ0dpLXl5UFpCd1pGenRJIn0='

// const TEST_AUTHPRIVKEY =
//   'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsic2lnbiJdLCJleHQiOnRydWUsImNydiI6IlAtNTIxIiwieCI6IkFQdDFBUndud3lPNlhmRHFhTTRVNkhkUUp5Q01HZ1JOcEJMMUl3Y3ZkX3VUTXNzajJkQk91Q2pBSkNQUXNlRXVZeW5WV3VzemItVDNkRENvUTk5cnlaNjUiLCJ5IjoiQUY2R3dfcHk0a2dMc0VENmx5VjlZRHdLU2ZtbGh0LVBxako2dnF2cWZTZkZ4R1RvVUd2Rjh5NDlQcnJaMEt3ZTNtdzBQdXBUR0NHaS15eVBaQndaRnp0SSIsImQiOiJBYU9pNUVtNUM5X0dTT0E5bjV0cEFQLUdCcUFxUDFucU1Bd3ROVUpPSzVwWjNpX09ZVjV5b3RTNnk2ZWRrbWlYMURQVVFDVmVzX3FnU3dKUWhXb2M5XzB0In0='

// const TEST_PUBKEY =
//   'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwiY3J2IjoiUC01MjEiLCJ4IjoiQWJpRUV5QTFGTVhmRklWN0p4c0hUVzJlQXNTX1llZ0hvQlp0R2xaaGRfSXZVSzJmay16RC14dEhmYUFESnFyNXViTEw2eWItTUtLZHktNUhvRnVSNEN1dSIsInkiOiJBZXRiLUhDY19IbGhScUYxT0pHUmlYMS15aWk5SUhzazFJT252dXF6OXlPVFlsOGpSLXNTNHpEaUd6ODBJWHJ2Qm1zTzVPRHZpYWxYN1E5enJ5MHFlS0lkIn0='

const TEST_PRIVKEY =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsic2lnbiJdLCJleHQiOnRydWUsImNydiI6IlAtNTIxIiwieCI6IkFmRVhoOTY5VTRxMUo3RDNZQlBpMFY2ODlPdUFaOVJGZS1STHRhSFE4QmUwTEQ2LWQ5dlJ1ZEFFMnlHTE10Z0lMX1drekhSRF9TNjg2M1BkUUZKLTJydnEiLCJ5IjoiQUtpZ0Ftd2FPcF9Vd3V2NXZqOEE4UXFjS2Z3WG42enZNUHU3QWhOdkFDdE5qdC1UdTBvRWg3d0Z5dGJDR3FNaFRYMm01SEJnZlZhbTh5aTRMWkRiSWlYcCIsImQiOiJBVVJnWGpLazBtaDlsbDdtVDZvRDJTT09TZEF1bWpITFQtOU1pZnRsd1VNOGpiTlNRMkJxOVlBemNvVkZRRmV5VzEzbVNzY3dUT0dUbTRxZ1QwWDJnV1VmIn0='

describe('required options missing', () => {
  it('throws when PRIVKEY is not provided', async () => {
    await expect(
      worker.fetch(
        new Request('http://localhost/'),
        {
          // PRIVKEY: 'test',
          AUTH_DOMAIN: 'test',
          AUTH_PUBKEY: 'test',
        } as any,
        {} as any,
      ),
    ).rejects.toThrow('env.PRIVKEY は必須です')
  })

  it('throws when AUTH_DOMAIN is not provided', async () => {
    await expect(
      worker.fetch(
        new Request('http://localhost/'),
        {
          PRIVKEY: 'test',
          // AUTH_DOMAIN: 'test',
          AUTH_PUBKEY: 'test',
        } as any,
        {} as any,
      ),
    ).rejects.toThrow('env.AUTH_DOMAIN は必須です')
  })

  it('throws when AUTH_PUBKEY is not provided', async () => {
    await expect(
      worker.fetch(
        new Request('http://localhost/'),
        {
          PRIVKEY: 'test',
          AUTH_DOMAIN: 'test',
          // AUTH_PUBKEY: 'test',
        } as any,
        {} as any,
      ),
    ).rejects.toThrow('env.AUTH_PUBKEY は必須です')
  })
})

describe('common', () => {
  // 各処理についてはそれぞれのテストで行っているため、ここではURLのみを確認する
  it("defines route '/auth/callback'", async () => {
    const res = await worker.fetch(
      new Request('http://localhost/auth/callback'),
      {
        PRIVKEY: TEST_PRIVKEY,
        AUTH_DOMAIN: 'https://auth.server.test',
        AUTH_PUBKEY: TEST_AUTHPUBKEY,
      },
      {} as any,
    )
    expect(res.status).not.toBe(404)
  })

  it("defines route '/auth/logout'", async () => {
    const res = await worker.fetch(
      new Request('http://localhost/auth/logout'),
      {
        PRIVKEY: TEST_PRIVKEY,
        AUTH_DOMAIN: 'https://auth.server.test',
        AUTH_PUBKEY: TEST_AUTHPUBKEY,
      },
      {} as any,
    )
    expect(res.status).not.toBe(404)
  })

  it("defines route '/auth/me'", async () => {
    const res = await worker.fetch(
      new Request('http://localhost/auth/me'),
      {
        PRIVKEY: TEST_PRIVKEY,
        AUTH_DOMAIN: 'https://auth.server.test',
        AUTH_PUBKEY: TEST_AUTHPUBKEY,
      },
      {} as any,
    )
    expect(res.status).not.toBe(404)
  })

  it("returns 404 for '/auth/*'", async () => {
    const res = await worker.fetch(
      new Request('http://localhost/auth/hoge'),
      {
        PRIVKEY: TEST_PRIVKEY,
        AUTH_DOMAIN: 'https://auth.server.test',
        AUTH_PUBKEY: TEST_AUTHPUBKEY,
      },
      {} as any,
    )
    expect(res.status).toBe(404)
  })
})

describe('dev mode', () => {
  it("defines route '/auth/login'", async () => {
    const res = await worker.fetch(
      new Request('http://localhost/auth/login'),
      {
        PRIVKEY: TEST_PRIVKEY,
        AUTH_DOMAIN: 'https://auth.server.test',
        AUTH_PUBKEY: TEST_AUTHPUBKEY,
        IS_DEV: 'true',
      },
      {} as any,
    )
    expect(res.status).not.toBe(404)
  })

  it('redirects to login when not logged in', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/'),
      {
        PRIVKEY: TEST_PRIVKEY,
        AUTH_DOMAIN: 'https://auth.server.test',
        AUTH_PUBKEY: TEST_AUTHPUBKEY,
        IS_DEV: 'true',
      },
      {} as any,
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/auth/login')
  })
})

describe('prod mode', () => {
  let mockedFetch: MockInstance

  beforeEach(() => {
    mockedFetch = vi
      .spyOn(global, 'fetch')
      .mockImplementation(async (path, options): Promise<any> => {
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
          return new Response(
            JSON.stringify({ token: btoa('token'), iv: btoa('iv') }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          )
        }

        // webapp/app/routes/user.tsx
        if (path === 'https://auth.server.test/user') {
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

        console.error('unexpected fetch', path)
        return new Response(null, { status: 500 })
      })
  })

  afterEach(() => {
    mockedFetch.mockRestore()
  })

  it("returns 404 for '/auth/login'", async () => {
    const res = await worker.fetch(
      new Request('http://localhost/auth/login'),
      {
        PRIVKEY: TEST_PRIVKEY,
        AUTH_DOMAIN: 'https://auth.server.test',
        AUTH_PUBKEY: TEST_AUTHPUBKEY,
      },
      {} as any,
    )
    expect(res.status).toBe(404)
  })

  it('redirects to login when not logged in', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/', { headers: new Headers() }),
      {
        PRIVKEY: TEST_PRIVKEY,
        AUTH_DOMAIN: 'https://auth.server.test',
        AUTH_PUBKEY: TEST_AUTHPUBKEY,
      },
      {} as any,
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('https://auth.server.test/go')
  })
})
