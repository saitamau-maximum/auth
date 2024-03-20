import type { CookieSerializeOptions } from 'cookie'

export const cookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  secure: true,
  path: '/',
  maxAge: 60 * 60 * 24, // 1 day
}
