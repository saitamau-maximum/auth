import { serialize as serializeCookie } from 'cookie'

import { cookieOptions } from './cookie'

export const handleLogout = async (request: Request): Promise<Response> => {
  const newHeader = new Headers(request.headers)
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__authdata', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__iv', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__sign1', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__sign2', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__continue_to', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.set('Location', '/')

  return new Response(null, {
    status: 302,
    headers: newHeader,
  })
}
