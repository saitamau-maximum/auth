/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { describe, expect, it } from 'vitest'

import { handleLogout } from '../../src/internal/handleLogout'

import { cookieParser, removesCookie } from './cookieUtil'

describe('works', () => {
  it("removes 'token' cookie", async () => {
    const req = new Request('https://example.com/auth/logout')
    const res = await handleLogout(req)
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(removesCookie(cookie, 'token')).toBeTruthy()
  })

  it("removes '__continue_to' cookie", async () => {
    const req = new Request('https://example.com/auth/logout')
    const res = await handleLogout(req)
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(removesCookie(cookie, '__continue_to')).toBeTruthy()
  })

  it("removes '__dev_logged_in' cookie", async () => {
    const req = new Request('https://example.com/auth/logout')
    const res = await handleLogout(req)
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(removesCookie(cookie, '__dev_logged_in')).toBeTruthy()
  })

  it('returns HTML', async () => {
    const req = new Request('https://example.com/auth/logout')
    const res = await handleLogout(req)
    expect(res.headers.get('Content-Type')).toBe('text/html')
  })

  it('returns 200', async () => {
    const req = new Request('https://example.com/auth/logout')
    const res = await handleLogout(req)
    expect(res.status).toBe(200)
  })
})
