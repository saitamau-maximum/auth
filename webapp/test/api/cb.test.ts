// jsdom だと TextEncoder と Uint8Array の互換性がないみたいなので node でテストする (挙動は同じ...はず)
// https://github.com/vitest-dev/vitest/issues/4043
// @vitest-environment node

import { Env } from 'load-context'
import cookieSessionStorage from 'utils/session.server'
import { describe, expect, it, vi } from 'vitest'

import apiServer from '../../api'

const MOCK_ENV = {
  SYMKEY:
    'eyJrdHkiOiJvY3QiLCJrZXlfb3BzIjpbImVuY3J5cHQiLCJkZWNyeXB0Il0sImFsZyI6IkEyNTZHQ00iLCJleHQiOnRydWUsImsiOiJoRU1RY0NIRFJWZ3BQWTRhZTV0a3VxYk4xWDNWRkRlUzBxempmVzlyY3NjIn0=',
  CF_PAGES_URL: 'https://example.com',
  SESSION_SECRET: 'secret',
  GITHUB_OAUTH_ID: 'github_oauth_id',
  GITHUB_OAUTH_SECRET: 'github_oauth_secret',
  GITHUB_APP_ID: 'github_app_id',
  GITHUB_APP_PRIVKEY: btoa('github_app_privkey'),
  DB: {},
}

vi.spyOn(global, 'fetch').mockImplementation(async (path, options) => {
  if (path === 'https://github.com/login/oauth/access_token') {
    const body = JSON.parse(options?.body as string)
    if (body.code === 'member') {
      return new Response(JSON.stringify({ access_token: 'member' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (body.code === 'leader') {
      return new Response(JSON.stringify({ access_token: 'leader' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (body.code === 'non member') {
      return new Response(JSON.stringify({ access_token: 'non member' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(null, { status: 400 })
  }
  throw new Error('Unexpected fetch: ' + path)
})

vi.mock('octokit', async () => {
  class Octokit {
    isApp: boolean
    access_token: string

    constructor(options: Record<string, unknown>) {
      if ('auth' in options) {
        this.isApp = false
        this.access_token = options.auth as string
      } else {
        this.isApp = true
        this.access_token = ''
      }
    }

    async request(route: string, options?: Record<string, string>) {
      if (route === 'GET /user') {
        if (this.access_token === 'member') {
          return {
            data: { id: 1, login: 'member', avatar_url: 'https://example.com' },
          }
        }
        if (this.access_token === 'leader') {
          return {
            data: { id: 2, login: 'leader', avatar_url: 'https://example.net' },
          }
        }
        if (this.access_token === 'non member') {
          return {
            data: {
              id: 3,
              login: 'non-member',
              avatar_url: 'https://example.invalid',
            },
          }
        }
        throw new Error('Unexpected access_token: ' + this.access_token)
      }
      if (route === 'GET /orgs/{org}/members/{username}') {
        if (options?.username === 'member') {
          return { status: 204 }
        }
        if (options?.username === 'leader') {
          return { status: 204 }
        }
        if (options?.username === 'non-member') {
          throw new Error('404') // Octokit が not ok なら throw するので
        }
        throw new Error('Unexpected username: ' + options?.username)
      }
      if (route === 'GET /orgs/{org}/teams') {
        return { data: [{ slug: 'leaders', name: 'Leaders' }] }
      }
      if (route === 'GET /orgs/{org}/teams/{team_slug}/members') {
        if (options?.team_slug === 'leaders') {
          return { data: [{ id: 2 }] }
        }
        throw new Error('Unexpected team_slug: ' + options?.team_slug)
      }
      throw new Error('Unexpected route: ' + route)
    }
  }
  return { Octokit }
})

it('returns 405 if method != GET', async () => {
  const res1 = await apiServer.request('/cb', { method: 'POST' }, MOCK_ENV)
  expect(res1.status).toBe(405)

  // HEAD は GET 時の header を返す method なので許容
  // const res2 = await apiServer.request('/cb', { method: 'HEAD' }, MOCK_ENV)
  // expect(res2.status).toBe(405)

  const res3 = await apiServer.request('/cb', { method: 'PUT' }, MOCK_ENV)
  expect(res3.status).toBe(405)

  const res4 = await apiServer.request('/cb', { method: 'DELETE' }, MOCK_ENV)
  expect(res4.status).toBe(405)

  const res5 = await apiServer.request('/cb', { method: 'OPTIONS' }, MOCK_ENV)
  expect(res5.status).toBe(405)

  const res6 = await apiServer.request('/cb', { method: 'PATCH' }, MOCK_ENV)
  expect(res6.status).toBe(405)

  const res7 = await apiServer.request(
    '/cb',
    { method: 'MYCUSTOMMETHOD' },
    MOCK_ENV,
  )
  expect(res7.status).toBe(405)

  // connect and trace are not supported by Hono
})

it('returns 400 if missing code', async () => {
  const param = new URLSearchParams()
  param.set('state', 'state')

  const res = await apiServer.request('/cb?' + param.toString(), {}, MOCK_ENV)
  expect(res.status).toBe(400)
  expect(await res.text()).toContain('ZodError')
})

it('returns 400 if missing state', async () => {
  const param = new URLSearchParams()
  param.set('code', 'code')

  const res = await apiServer.request('/cb?' + param.toString(), {}, MOCK_ENV)
  expect(res.status).toBe(400)
  expect(await res.text()).toContain('ZodError')
})

it('returns 400 for mismatch state', async () => {
  const param = new URLSearchParams()
  param.set('code', 'code')
  param.set('state', 'state')

  const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
  const session = await getSession('')
  session.flash('state', 'mismatch')

  const headers = new Headers()
  headers.set('Cookie', await commitSession(session))

  const res = await apiServer.request(
    '/cb?' + param.toString(),
    { headers },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('state mismatch')
})

it('returns 400 for invalid code', async () => {
  const param = new URLSearchParams()
  param.set('code', 'code')
  param.set('state', 'state')

  const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
  const session = await getSession('')
  session.flash('state', 'state')

  const headers = new Headers()
  headers.set('Cookie', await commitSession(session))

  const res = await apiServer.request(
    '/cb?' + param.toString(),
    { headers },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid code')
})

describe('member', async () => {
  it('returns 302', async () => {
    const param = new URLSearchParams()
    param.set('code', 'member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const session = await getSession('')
    session.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(session))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    expect(res.status).toBe(302)
  })

  it('sets cookie', async () => {
    const param = new URLSearchParams()
    param.set('code', 'member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const session = await getSession('')
    session.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(session))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    // Cookie 属性 (secure, httpOnly, etc) は go.test.ts で行っているので省略
    expect(res.headers.get('Set-Cookie')).toMatch(/^__session=[^;]+; /)
  })

  it('sets id', async () => {
    const param = new URLSearchParams()
    param.set('code', 'member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('id')).toBe('1')
  })

  it('sets display_name', async () => {
    const param = new URLSearchParams()
    param.set('code', 'member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('display_name')).toBe('member')
  })

  it('sets profile_image', async () => {
    const param = new URLSearchParams()
    param.set('code', 'member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('profile_image')).toBe('https://example.com')
  })

  it('sets is_member', async () => {
    const param = new URLSearchParams()
    param.set('code', 'member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('is_member')).toBe(true)
  })

  it('sets teams', async () => {
    const param = new URLSearchParams()
    param.set('code', 'member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('teams')).toStrictEqual([])
  })
})

describe('member with role', async () => {
  it('returns 302', async () => {
    const param = new URLSearchParams()
    param.set('code', 'leader')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const session = await getSession('')
    session.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(session))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    expect(res.status).toBe(302)
  })

  it('sets cookie', async () => {
    const param = new URLSearchParams()
    param.set('code', 'leader')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const session = await getSession('')
    session.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(session))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    // Cookie 属性 (secure, httpOnly, etc) は go.test.ts で行っているので省略
    expect(res.headers.get('Set-Cookie')).toMatch(/^__session=[^;]+; /)
  })

  it('sets id', async () => {
    const param = new URLSearchParams()
    param.set('code', 'leader')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('id')).toBe('2')
  })

  it('sets display_name', async () => {
    const param = new URLSearchParams()
    param.set('code', 'leader')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('display_name')).toBe('leader')
  })

  it('sets profile_image', async () => {
    const param = new URLSearchParams()
    param.set('code', 'leader')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('profile_image')).toBe('https://example.net')
  })

  it('sets is_member', async () => {
    const param = new URLSearchParams()
    param.set('code', 'leader')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('is_member')).toBe(true)
  })

  it('sets teams', async () => {
    const param = new URLSearchParams()
    param.set('code', 'leader')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('teams')).toStrictEqual(['Leaders'])
  })
})

describe('non-member', async () => {
  it('returns 302', async () => {
    const param = new URLSearchParams()
    param.set('code', 'non member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const session = await getSession('')
    session.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(session))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    expect(res.status).toBe(302)
  })

  it('sets cookie', async () => {
    const param = new URLSearchParams()
    param.set('code', 'non member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const session = await getSession('')
    session.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(session))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    // Cookie 属性 (secure, httpOnly, etc) は go.test.ts で行っているので省略
    expect(res.headers.get('Set-Cookie')).toMatch(/^__session=[^;]+; /)
  })

  it('sets id', async () => {
    const param = new URLSearchParams()
    param.set('code', 'non member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('id')).toBe('3')
  })

  it('sets display_name', async () => {
    const param = new URLSearchParams()
    param.set('code', 'non member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('display_name')).toBe('non-member')
  })

  it('sets profile_image', async () => {
    const param = new URLSearchParams()
    param.set('code', 'non member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('profile_image')).toBe('https://example.invalid')
  })

  it('sets is_member', async () => {
    const param = new URLSearchParams()
    param.set('code', 'non member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('is_member')).toBe(false)
  })

  it('sets teams', async () => {
    const param = new URLSearchParams()
    param.set('code', 'non member')
    param.set('state', 'state')

    const { getSession, commitSession } = cookieSessionStorage(MOCK_ENV as Env)
    const reqSession = await getSession('')
    reqSession.flash('state', 'state')

    const headers = new Headers()
    headers.set('Cookie', await commitSession(reqSession))

    const res = await apiServer.request(
      '/cb?' + param.toString(),
      { headers },
      MOCK_ENV,
    )
    const resSession = await getSession(
      res.headers
        .getSetCookie()
        .map(v => v.split(';')[0])
        .join(';'),
    )

    expect(resSession.get('teams')).toStrictEqual([])
  })
})
