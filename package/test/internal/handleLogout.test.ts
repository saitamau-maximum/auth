/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest'

import { handleLogout } from '../../src/internal/handleLogout'

import { cookieParser, removesCookie } from './cookieUtil'

describe('works', () => {
  it("removes '__authdata' cookie", async () => {
    const req = new Request('https://example.com/auth/logout')
    const res = await handleLogout(req)
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(removesCookie(cookie, '__authdata')).toBeTruthy()
  })

  it("removes '__iv' cookie", async () => {
    const req = new Request('https://example.com/auth/logout')
    const res = await handleLogout(req)
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(removesCookie(cookie, '__iv')).toBeTruthy()
  })

  it("removes '__sign1' cookie", async () => {
    const req = new Request('https://example.com/auth/logout')
    const res = await handleLogout(req)
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(removesCookie(cookie, '__sign1')).toBeTruthy()
  })

  it("removes '__sign2' cookie", async () => {
    const req = new Request('https://example.com/auth/logout')
    const res = await handleLogout(req)
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(removesCookie(cookie, '__sign2')).toBeTruthy()
  })

  it("removes '__sign3' cookie", async () => {
    const req = new Request('https://example.com/auth/logout')
    const res = await handleLogout(req)
    expect(res.headers.has('Set-Cookie')).toBeTruthy()
    const cookie = cookieParser(res.headers.get('Set-Cookie')!)
    expect(removesCookie(cookie, '__sign3')).toBeTruthy()
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
