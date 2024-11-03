// jsdom だと TextEncoder と Uint8Array の互換性がないみたいなので node でテストする (挙動は同じ...はず)
// https://github.com/vitest-dev/vitest/issues/4043
// @vitest-environment node

import {
  importKey,
  keypairProtectedHeader,
} from '@saitamau-maximum/auth/internal'
import { SignJWT } from 'jose'
import { expect, it, vi } from 'vitest'

import apiServer from '../../api'

const TEST_PUBKEY =
  'eyJrZXlfb3BzIjpbInZlcmlmeSJdLCJleHQiOnRydWUsImt0eSI6IkVDIiwieCI6IkFPMXVrSVhadGlWcEg5TnJXWUdyTU8tR3o5TlVQNzVKaFZlX2dQNlZINGRqeGdJWnZNUFc4bGJ6aEtwSDZtMGt1cDZmSTJZYWFYNnlicndIUmxEN19IZmciLCJ5IjoiQUJGRmhYZXhYSXBaMHlwek94UVlkcUNxV19BaGNHTDdYLVc4U3doOWNVT0xidktoclRLZGdHWmtVVS1TRkNqc0k4VFZGVkF2U0lrVWlfTFhXbEtWRFhRZCIsImNydiI6IlAtNTIxIn0='

const TEST_PRIVKEY = await importKey(
  'eyJrZXlfb3BzIjpbInNpZ24iXSwiZXh0Ijp0cnVlLCJrdHkiOiJFQyIsIngiOiJBTzF1a0lYWnRpVnBIOU5yV1lHck1PLUd6OU5VUDc1SmhWZV9nUDZWSDRkanhnSVp2TVBXOGxiemhLcEg2bTBrdXA2ZkkyWWFhWDZ5YnJ3SFJsRDdfSGZnIiwieSI6IkFCRkZoWGV4WElwWjB5cHpPeFFZZHFDcVdfQWhjR0w3WC1XOFN3aDljVU9MYnZLaHJUS2RnR1prVVUtU0ZDanNJOFRWRlZBdlNJa1VpX0xYV2xLVkRYUWQiLCJjcnYiOiJQLTUyMSIsImQiOiJBQ2pObWRlY2Q1MHVIRkxHbVIweXhlb0NXQ2FZYjdaT0FJb0NJeGQ3WXUtNnQxQ0xsTGVYakVOSmRLV1BSaUpCaDVDRFJOdlR4OEZrNWFpYjFNNUt6akVQIn0=',
  'privateKey',
)

const TEST_PUBKEY2 =
  'eyJrZXlfb3BzIjpbInZlcmlmeSJdLCJleHQiOnRydWUsImt0eSI6IkVDIiwieCI6IkFUZU9HbnlodldxQ3c2cHkyMEt4MVg3MnM3Y1p4WjNncHF6b3VuUWg2cExlcFFRR3Y4VDNuQWFFd183b2J5cU5CUFRMdzU2dVc0TUp5QWR3WU9XaFczeVoiLCJ5IjoiQVd6RjE3Tmxvd09VSklOMUhUbVZhRTRrRmJSMWhEczkxcmhtdFVIWk8wY1VzSThGMXpwaFd2cDlfcTNzMTh1akJnLXpKdVplTkxWeUtRNHg0NktpTElQNCIsImNydiI6IlAtNTIxIn0='

vi.mock('../../data/pubkey.json', () => ({
  default: [
    {
      name: 'name1',
      pubkey:
        'eyJrZXlfb3BzIjpbInZlcmlmeSJdLCJleHQiOnRydWUsImt0eSI6IkVDIiwieCI6IkFPMXVrSVhadGlWcEg5TnJXWUdyTU8tR3o5TlVQNzVKaFZlX2dQNlZINGRqeGdJWnZNUFc4bGJ6aEtwSDZtMGt1cDZmSTJZYWFYNnlicndIUmxEN19IZmciLCJ5IjoiQUJGRmhYZXhYSXBaMHlwek94UVlkcUNxV19BaGNHTDdYLVc4U3doOWNVT0xidktoclRLZGdHWmtVVS1TRkNqc0k4VFZGVkF2U0lrVWlfTFhXbEtWRFhRZCIsImNydiI6IlAtNTIxIn0=',
    },
    {
      name: 'name2',
      pubkey:
        'eyJrZXlfb3BzIjpbInZlcmlmeSJdLCJleHQiOnRydWUsImt0eSI6IkVDIiwieCI6IkFUZU9HbnlodldxQ3c2cHkyMEt4MVg3MnM3Y1p4WjNncHF6b3VuUWg2cExlcFFRR3Y4VDNuQWFFd183b2J5cU5CUFRMdzU2dVc0TUp5QWR3WU9XaFczeVoiLCJ5IjoiQVd6RjE3Tmxvd09VSklOMUhUbVZhRTRrRmJSMWhEczkxcmhtdFVIWk8wY1VzSThGMXpwaFd2cDlfcTNzMTh1akJnLXpKdVplTkxWeUtRNHg0NktpTElQNCIsImNydiI6IlAtNTIxIn0=',
    },
  ],
}))

const MOCK_ENV = {
  SYMKEY:
    'eyJrZXlfb3BzIjpbImVuY3J5cHQiLCJkZWNyeXB0Il0sImV4dCI6dHJ1ZSwia3R5Ijoib2N0IiwiayI6IlAzZmdPZWRNM2d4OGV0RFdpZG1zVGE0UnphcEtmQ1o4azdVTi0zUjhSVjQiLCJhbGciOiJBMjU2R0NNIn0=',
  DB: {},
}

it('returns 405 if method != POST', async () => {
  const res1 = await apiServer.request('/token', { method: 'GET' }, MOCK_ENV)
  expect(res1.status).toBe(405)

  const res2 = await apiServer.request('/token', { method: 'HEAD' }, MOCK_ENV)
  expect(res2.status).toBe(405)

  const res3 = await apiServer.request('/token', { method: 'PUT' }, MOCK_ENV)
  expect(res3.status).toBe(405)

  const res4 = await apiServer.request('/token', { method: 'DELETE' }, MOCK_ENV)
  expect(res4.status).toBe(405)

  const res5 = await apiServer.request(
    '/token',
    { method: 'OPTIONS' },
    MOCK_ENV,
  )
  expect(res5.status).toBe(405)

  const res6 = await apiServer.request('/token', { method: 'PATCH' }, MOCK_ENV)
  expect(res6.status).toBe(405)

  const res7 = await apiServer.request(
    '/token',
    { method: 'MYCUSTOMMETHOD' },
    MOCK_ENV,
  )
  expect(res7.status).toBe(405)

  // connect and trace are not supported by Hono
})

it('returns 400 if Content-Type != application/json', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('body must be application/json')
})

it('returns 400 if body is not JSON', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('Malformed JSON in request body')
})

it('returns 400 for name-missing body', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pubkey: 'pubkey',
        callback: 'callback',
        mac: 'mac',
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toContain('ZodError')
})

it('returns 400 for pubkey-missing body', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'name', callback: 'callback', mac: 'mac' }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toContain('ZodError')
})

it('returns 400 for callback-missing body', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'name', pubkey: 'pubkey', mac: 'mac' }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toContain('ZodError')
})

it('returns 400 for mac-missing body', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name',
        pubkey: 'pubkey',
        callback: 'callback',
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toContain('ZodError')
})

it('returns 400 for invalid callback (not url)', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name',
        pubkey: 'pubkey',
        callback: 'callback',
        mac: 'mac',
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toContain('ZodError')
})

it('returns 400 for invalid callback (containing username)', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name',
        pubkey: 'pubkey',
        callback: 'http://user:@example.com/callback',
        mac: 'mac',
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe(
    'cannot contain username, password, search, or hash',
  )
})

it('returns 400 for invalid callback (containing password)', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name',
        pubkey: 'pubkey',
        callback: 'http://user:pass@example.com/callback',
        mac: 'mac',
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe(
    'cannot contain username, password, search, or hash',
  )
})

it('returns 400 for invalid callback (containing search)', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name',
        pubkey: 'pubkey',
        callback: 'http://example.com/callback?foo',
        mac: 'mac',
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe(
    'cannot contain username, password, search, or hash',
  )
})

it('returns 400 for invalid callback (containing hash)', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name',
        pubkey: 'pubkey',
        callback: 'http://example.com/callback#bar',
        mac: 'mac',
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe(
    'cannot contain username, password, search, or hash',
  )
})

it('returns 400 for non-registered name', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name',
        pubkey: TEST_PUBKEY,
        callback: 'http://example.com/callback',
        mac: 'mac',
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('data not found')
})

it('returns 400 for non-registered pubkey', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name1',
        pubkey: 'pubkey',
        callback: 'http://example.com/callback',
        mac: 'mac',
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('data not found')
})

it('returns 400 for non-registered name&pubkey pair', async () => {
  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name1',
        pubkey: TEST_PUBKEY2,
        callback: 'http://example.com/callback',
        mac: 'mac',
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('data not found')
})

it('returns 400 for invalid mac (mismatched callback)', async () => {
  const mac = await new SignJWT({ callback: 'http://example.net/callback' })
    .setSubject('Maximum Auth Token')
    .setIssuer('name1')
    .setAudience('maximum-auth')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(TEST_PRIVKEY)

  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name1',
        pubkey: TEST_PUBKEY,
        callback: 'http://example.com/callback',
        mac,
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid mac')
})

it('returns 400 for invalid mac (incorrect subject)', async () => {
  const mac = await new SignJWT({ callback: 'http://example.com/callback' })
    .setSubject('Maximum Auth Token 1')
    .setIssuer('name1')
    .setAudience('maximum-auth')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(TEST_PRIVKEY)

  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name1',
        pubkey: TEST_PUBKEY,
        callback: 'http://example.com/callback',
        mac,
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid mac')
})

it('returns 400 for invalid mac (mismatch issuer)', async () => {
  const mac = await new SignJWT({ callback: 'http://example.com/callback' })
    .setSubject('Maximum Auth Token')
    .setIssuer('name2')
    .setAudience('maximum-auth')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(TEST_PRIVKEY)

  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name1',
        pubkey: TEST_PUBKEY,
        callback: 'http://example.com/callback',
        mac,
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid mac')
})

it('returns 400 for invalid mac (incorrect audience)', async () => {
  const mac = await new SignJWT({ callback: 'http://example.com/callback' })
    .setSubject('Maximum Auth Token')
    .setIssuer('name1')
    .setAudience('maximum-auth-foo')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(TEST_PRIVKEY)

  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name1',
        pubkey: TEST_PUBKEY,
        callback: 'http://example.com/callback',
        mac,
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid mac')
})

it('returns 400 for invalid mac (expired)', async () => {
  const mac = await new SignJWT({ callback: 'http://example.com/callback' })
    .setSubject('Maximum Auth Token')
    .setIssuer('name1')
    .setAudience('maximum-auth')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('1 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(TEST_PRIVKEY)

  // tolerance 5sec 考慮で 7sec
  await new Promise(resolve => setTimeout(resolve, 7000))

  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name1',
        pubkey: TEST_PUBKEY,
        callback: 'http://example.com/callback',
        mac,
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid mac')
}, 10000)

it('returns 400 for invalid mac (incorrect key pair)', async () => {
  const mac = await new SignJWT({ callback: 'http://example.com/callback' })
    .setSubject('Maximum Auth Token')
    .setIssuer('name2')
    .setAudience('maximum-auth')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(TEST_PRIVKEY)

  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name2',
        pubkey: TEST_PUBKEY2,
        callback: 'http://example.com/callback',
        mac,
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid mac')
})

it('returns 200 if everything is ok', async () => {
  const mac = await new SignJWT({ callback: 'http://example.com/callback' })
    .setSubject('Maximum Auth Token')
    .setIssuer('name1')
    .setAudience('maximum-auth')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(TEST_PRIVKEY)

  const res = await apiServer.request(
    '/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'name1',
        pubkey: TEST_PUBKEY,
        callback: 'http://example.com/callback',
        mac,
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(200)
})
