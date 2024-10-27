// jsdom だと TextEncoder と Uint8Array の互換性がないみたいなので node でテストする (挙動は同じ...はず)
// https://github.com/vitest-dev/vitest/issues/4043
// @vitest-environment node

import { generateToken, importKey } from '@saitamau-maximum/auth/internal'
import { Env } from 'load-context'
import cookieSessionStorage from 'utils/session.server'
import { beforeAll, describe, expect, it } from 'vitest'

import apiServer from '../../api'

const MOCK_ENV = {
  SYMKEY:
    'eyJrZXlfb3BzIjpbImVuY3J5cHQiLCJkZWNyeXB0Il0sImV4dCI6dHJ1ZSwia3R5Ijoib2N0IiwiayI6IjQ4QVltbENlNF84UlpGTWl6R2ltX2o4VGtPSFAzVmtjZ1E0WWJfcVJ0YjQiLCJhbGciOiJBMjU2R0NNIn0=',
  CF_PAGES_URL: 'https://example.com',
  SESSION_SECRET: 'secret',
  GITHUB_OAUTH_ID: 'github_oauth_id',
}

it('returns 405 if method != GET', async () => {
  const res1 = await apiServer.request('/go', { method: 'POST' })
  expect(res1.status).toBe(405)

  // HEAD は GET 時の header を返す method なので許容
  // const res2 = await apiServer.request('/go', { method: 'HEAD' })
  // expect(res2.status).toBe(405)

  const res3 = await apiServer.request('/go', { method: 'PUT' })
  expect(res3.status).toBe(405)

  const res4 = await apiServer.request('/go', { method: 'DELETE' })
  expect(res4.status).toBe(405)

  const res5 = await apiServer.request('/go', { method: 'OPTIONS' })
  expect(res5.status).toBe(405)

  const res6 = await apiServer.request('/go', { method: 'PATCH' })
  expect(res6.status).toBe(405)

  const res7 = await apiServer.request('/go', { method: 'MYCUSTOMMETHOD' })
  expect(res7.status).toBe(405)

  // connect and trace are not supported by Hono
})

it('returns 400 if missing name', async () => {
  const name = 'name'
  const pubkey = 'pubkey'
  const callback = 'http://example.com/callback'
  const token = await generateToken({
    name,
    pubkey,
    callback,
    symkey: await importKey(MOCK_ENV.SYMKEY, 'symmetric'),
  })

  const param = new URLSearchParams()
  param.set('pubkey', pubkey)
  param.set('callback', callback)
  param.set('token', token)

  const res = await apiServer.request('/go?' + param.toString())
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('required field missing')
})

it('returns 400 if missing pubkey', async () => {
  const name = 'name'
  const pubkey = 'pubkey'
  const callback = 'http://example.com/callback'
  const token = await generateToken({
    name,
    pubkey,
    callback,
    symkey: await importKey(MOCK_ENV.SYMKEY, 'symmetric'),
  })

  const param = new URLSearchParams()
  param.set('name', name)
  param.set('callback', callback)
  param.set('token', token)

  const res = await apiServer.request('/go?' + param.toString())
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('required field missing')
})

it('returns 400 if missing callback', async () => {
  const name = 'name'
  const pubkey = 'pubkey'
  const callback = 'http://example.com/callback'
  const token = await generateToken({
    name,
    pubkey,
    callback,
    symkey: await importKey(MOCK_ENV.SYMKEY, 'symmetric'),
  })

  const param = new URLSearchParams()
  param.set('name', name)
  param.set('pubkey', pubkey)
  param.set('token', token)

  const res = await apiServer.request('/go?' + param.toString())
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('required field missing')
})

it('returns 400 if missing token', async () => {
  const name = 'name'
  const pubkey = 'pubkey'
  const callback = 'http://example.com/callback'

  const param = new URLSearchParams()
  param.set('name', name)
  param.set('pubkey', pubkey)
  param.set('callback', callback)

  const res = await apiServer.request('/go?' + param.toString())
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('required field missing')
})

it('returns 400 for tampered token (token)', async () => {
  const name = 'name'
  const pubkey = 'pubkey'
  const callback = 'http://example.com/callback'

  const param = new URLSearchParams()
  param.set('name', name)
  param.set('pubkey', pubkey)
  param.set('callback', callback)
  param.set('token', 'foo')

  const res = await apiServer.request('/go?' + param.toString(), {}, MOCK_ENV)
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid token')
})

it('returns 400 for tampered token (name)', async () => {
  const name = 'name'
  const pubkey = 'pubkey'
  const callback = 'http://example.com/callback'
  const token = await generateToken({
    name,
    pubkey,
    callback,
    symkey: await importKey(MOCK_ENV.SYMKEY, 'symmetric'),
  })

  const param = new URLSearchParams()
  param.set('name', 'foo')
  param.set('pubkey', pubkey)
  param.set('callback', callback)
  param.set('token', token)

  const res = await apiServer.request('/go?' + param.toString(), {}, MOCK_ENV)
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid token')
})

it('returns 400 for tampered token (pubkey)', async () => {
  const name = 'name'
  const pubkey = 'pubkey'
  const callback = 'http://example.com/callback'
  const token = await generateToken({
    name,
    pubkey,
    callback,
    symkey: await importKey(MOCK_ENV.SYMKEY, 'symmetric'),
  })

  const param = new URLSearchParams()
  param.set('name', name)
  param.set('pubkey', 'foo')
  param.set('callback', callback)
  param.set('token', token)

  const res = await apiServer.request('/go?' + param.toString(), {}, MOCK_ENV)
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid token')
})

it('returns 400 for tampered token (callback)', async () => {
  const name = 'name'
  const pubkey = 'pubkey'
  const callback = 'http://example.com/callback'
  const token = await generateToken({
    name,
    pubkey,
    callback,
    symkey: await importKey(MOCK_ENV.SYMKEY, 'symmetric'),
  })

  const param = new URLSearchParams()
  param.set('name', name)
  param.set('pubkey', pubkey)
  param.set('callback', 'foo')
  param.set('token', token)

  const res = await apiServer.request('/go?' + param.toString(), {}, MOCK_ENV)
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid token')
})

it('returns 302 if everything is ok', async () => {
  const name = 'name'
  const pubkey = 'pubkey'
  const callback = 'http://example.com/callback'
  const token = await generateToken({
    name,
    pubkey,
    callback,
    symkey: await importKey(MOCK_ENV.SYMKEY, 'symmetric'),
  })

  const param = new URLSearchParams()
  param.set('name', name)
  param.set('pubkey', pubkey)
  param.set('callback', callback)
  param.set('token', token)

  const res = await apiServer.request('/go?' + param.toString(), {}, MOCK_ENV)
  expect(res.status).toBe(302)
})

describe('cookie', () => {
  let sessionCookie: string | undefined
  let sessionStorage: ReturnType<typeof cookieSessionStorage>['getSession']

  beforeAll(async () => {
    const name = 'name'
    const pubkey = 'pubkey'
    const callback = 'http://example.com/callback'
    const token = await generateToken({
      name,
      pubkey,
      callback,
      symkey: await importKey(MOCK_ENV.SYMKEY, 'symmetric'),
    })

    const param = new URLSearchParams()
    param.set('name', name)
    param.set('pubkey', pubkey)
    param.set('callback', callback)
    param.set('token', token)

    const res = await apiServer.request('/go?' + param.toString(), {}, MOCK_ENV)
    sessionCookie = res.headers
      .getSetCookie()
      .find(cookie => cookie.startsWith('__session='))
    sessionStorage = cookieSessionStorage(MOCK_ENV as Env).getSession
  })

  it('is set', async () => {
    expect(sessionCookie).toBeDefined()
  })

  it('is secure for remote', async () => {
    expect(sessionCookie).toMatch(/Secure/)
  })

  it('is not secure for local', async () => {
    const name = 'name'
    const pubkey = 'pubkey'
    const callback = 'http://example.com/callback'
    const token = await generateToken({
      name,
      pubkey,
      callback,
      symkey: await importKey(MOCK_ENV.SYMKEY, 'symmetric'),
    })

    const param = new URLSearchParams()
    param.set('name', name)
    param.set('pubkey', pubkey)
    param.set('callback', callback)
    param.set('token', token)

    const res = await apiServer.request(
      '/go?' + param.toString(),
      {},
      { ...MOCK_ENV, CF_PAGES_URL: 'http://localhost' },
    )
    const sessionCookie = res.headers
      .getSetCookie()
      .find(cookie => cookie.startsWith('__session='))
    expect(sessionCookie).toBeDefined()
    expect(sessionCookie).not.toMatch(/Secure/)
  })

  it('is httpOnly', async () => {
    expect(sessionCookie).toMatch(/HttpOnly/)
  })

  // strict にすると callback で cookie が送られないので
  it('is sameSite=lax', async () => {
    expect(sessionCookie).toMatch(/SameSite=Lax/)
  })

  it('is path=/', async () => {
    expect(sessionCookie).toMatch(/Path=\//)
  })

  it('is maxAge=1day', async () => {
    expect(sessionCookie).toMatch(/Max-Age=86400/)
  })

  it('sets continue_name', async () => {
    const session = await sessionStorage(sessionCookie)
    expect(session.get('continue_name')).toBe('name')
  })

  it('sets continue_to', async () => {
    const session = await sessionStorage(sessionCookie)
    expect(session.get('continue_to')).toBe('http://example.com/callback')
  })

  it('sets state', async () => {
    const session = await sessionStorage(sessionCookie)
    expect(session.get('state')).toBeDefined()
  })
})

describe('redirect', () => {
  let redirectTo: string | null
  let stateInSession: string | undefined

  beforeAll(async () => {
    const name = 'name'
    const pubkey = 'pubkey'
    const callback = 'http://example.com/callback'
    const token = await generateToken({
      name,
      pubkey,
      callback,
      symkey: await importKey(MOCK_ENV.SYMKEY, 'symmetric'),
    })

    const param = new URLSearchParams()
    param.set('name', name)
    param.set('pubkey', pubkey)
    param.set('callback', callback)
    param.set('token', token)

    const res = await apiServer.request('/go?' + param.toString(), {}, MOCK_ENV)
    redirectTo = res.headers.get('Location')
    const sessionStorage = cookieSessionStorage(MOCK_ENV as Env).getSession
    const session = await sessionStorage(res.headers.get('Set-Cookie'))
    stateInSession = session.get('state')
  })

  it('exists', async () => {
    expect(redirectTo).not.toBeNull()
  })

  it('redirects to GitHub OAuth', async () => {
    const url = new URL(redirectTo ?? '')
    expect(url.origin).toBe('https://github.com')
    expect(url.pathname).toBe('/login/oauth/authorize')
  })

  it('contains client_id', async () => {
    const url = new URL(redirectTo ?? '')
    expect(url.searchParams.get('client_id')).toBe('github_oauth_id')
  })

  it('contains redirect_uri', async () => {
    const url = new URL(redirectTo ?? '')
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.com/cb')
  })

  it('contains scope', async () => {
    const url = new URL(redirectTo ?? '')
    expect(url.searchParams.get('scope')).toBe('read:user')
  })

  it('contains state', async () => {
    const url = new URL(redirectTo ?? '')
    expect(url.searchParams.get('state')).toBe(stateInSession)
  })

  it('disallow allow_signup', async () => {
    const url = new URL(redirectTo ?? '')
    expect(url.searchParams.get('allow_signup')).toBe('false')
  })
})
