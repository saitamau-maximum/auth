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
}

it('should return 405 if method is not POST', async () => {
  const res1 = await apiServer.request('/token', { method: 'GET' })
  expect(res1.status).toBe(405)

  const res2 = await apiServer.request('/token', { method: 'HEAD' })
  expect(res2.status).toBe(405)

  const res3 = await apiServer.request('/token', { method: 'PUT' })
  expect(res3.status).toBe(405)

  const res4 = await apiServer.request('/token', { method: 'DELETE' })
  expect(res4.status).toBe(405)

  const res5 = await apiServer.request('/token', { method: 'OPTIONS' })
  expect(res5.status).toBe(405)

  const res6 = await apiServer.request('/token', { method: 'PATCH' })
  expect(res6.status).toBe(405)

  const res7 = await apiServer.request('/token', { method: 'MYCUSTOMMETHOD' })
  expect(res7.status).toBe(405)

  // connect and trace are not supported by Hono
})

it('should return 400 if Content-Type does not include application/json', async () => {
  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('body must be application/json')
})

it('should return 400 if the request body is not a valid JSON object', async () => {
  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'invalid json',
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('body is not a valid JSON object')
})

it('should return 400 if the request body is missing the name field', async () => {
  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pubkey: 'pubkey',
      callback: 'callback',
      mac: 'mac',
    }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('required field missing')
})

it('should return 400 if the request body is missing the pubkey field', async () => {
  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'name', callback: 'callback', mac: 'mac' }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('required field missing')
})

it('should return 400 if the request body is missing the callback field', async () => {
  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'name', pubkey: 'pubkey', mac: 'mac' }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('required field missing')
})

it('should return 400 if the request body is missing the mac field', async () => {
  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'name',
      pubkey: 'pubkey',
      callback: 'callback',
    }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('required field missing')
})

it('should return 400 if the name is not registered', async () => {
  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'name',
      pubkey: TEST_PUBKEY,
      callback: 'callback',
      mac: 'mac',
    }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('data not found')
})

it('should return 400 if the pubkey is not registered', async () => {
  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'name1',
      pubkey: 'pubkey',
      callback: 'callback',
      mac: 'mac',
    }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('data not found')
})

it('should return 400 if the name & pubkey pair is not registered', async () => {
  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'name1',
      pubkey: TEST_PUBKEY2,
      callback: 'callback',
      mac: 'mac',
    }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('data not found')
})

it('should return 400 if the mac is invalid (callback does not match)', async () => {
  const mac = await new SignJWT({ callback: 'callback1' })
    .setSubject('Maximum Auth Token')
    .setIssuer('name1')
    .setAudience('maximum-auth')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(TEST_PRIVKEY)

  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'name1',
      pubkey: TEST_PUBKEY,
      callback: 'callback2',
      mac,
    }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid mac')
})

it('should return 400 if the mac is invalid (subject is not correct)', async () => {
  const mac = await new SignJWT({ callback: 'callback' })
    .setSubject('Maximum Auth Token 1')
    .setIssuer('name1')
    .setAudience('maximum-auth')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(TEST_PRIVKEY)

  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'name1',
      pubkey: TEST_PUBKEY,
      callback: 'callback',
      mac,
    }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid mac')
})

it('should return 400 if the mac is invalid (issue does not match)', async () => {
  const mac = await new SignJWT({ callback: 'callback' })
    .setSubject('Maximum Auth Token')
    .setIssuer('name2')
    .setAudience('maximum-auth')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(TEST_PRIVKEY)

  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'name1',
      pubkey: TEST_PUBKEY,
      callback: 'callback',
      mac,
    }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid mac')
})

it('should return 400 if the mac is invalid (audience is not correct)', async () => {
  const mac = await new SignJWT({ callback: 'callback' })
    .setSubject('Maximum Auth Token')
    .setIssuer('name1')
    .setAudience('maximum-auth-foo')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(TEST_PRIVKEY)

  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'name1',
      pubkey: TEST_PUBKEY,
      callback: 'callback',
      mac,
    }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid mac')
})

it('should return 400 if the mac is invalid (expired)', async () => {
  const mac = await new SignJWT({ callback: 'callback' })
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

  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'name1',
      pubkey: TEST_PUBKEY,
      callback: 'callback',
      mac,
    }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid mac')
}, 10000)

it('should return 400 if the mac is invalid (key pair is not correct)', async () => {
  const mac = await new SignJWT({ callback: 'callback' })
    .setSubject('Maximum Auth Token')
    .setIssuer('name2')
    .setAudience('maximum-auth')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(TEST_PRIVKEY)

  const res = await apiServer.request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'name2',
      pubkey: TEST_PUBKEY2,
      callback: 'callback',
      mac,
    }),
  })
  expect(res.status).toBe(400)
  expect(await res.text()).toBe('invalid mac')
})

it('should return 200 if everything is valid', async () => {
  const mac = await new SignJWT({ callback: 'callback' })
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
        callback: 'callback',
        mac,
      }),
    },
    MOCK_ENV,
  )
  expect(res.status).toBe(200)
})
