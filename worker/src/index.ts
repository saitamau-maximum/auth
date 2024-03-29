import {
  checkLoggedIn,
  validateRequest as validateRequestFromProxy,
} from '@saitamau-maximum/auth'
import {
  derivePublicKey,
  exportKey,
  importKey,
  sign,
  handleLogin,
  handleLogout,
  handleCallback,
  handleMe,
} from '@saitamau-maximum/auth/internal'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

export default {
  async fetch(
    request: Request,
    env: Env,
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    ctx: ExecutionContext,
  ): Promise<Response> {
    for (const key of ['PRIVKEY', 'AUTH_DOMAIN', 'AUTH_PUBKEY'] as const) {
      if (!env[key]) {
        throw new Error(`env.${key} は必須です`)
      }
    }

    const url = new URL(request.url)

    const authName = 'Maximum Reverse Proxy'
    const privateKey = await importKey(env.PRIVKEY, 'privateKey')
    const publicKey = await derivePublicKey(privateKey)
    const dev = env.IS_DEV === 'true'

    // Auth Routes
    if (url.pathname.startsWith('/auth/')) {
      // Callback
      if (url.pathname === '/auth/callback') {
        return handleCallback(request, {
          authName,
          privateKey: env.PRIVKEY,
          authPubkey: env.AUTH_PUBKEY,
          dev,
        })
      }

      // Logout
      if (url.pathname === '/auth/logout') {
        return handleLogout(request)
      }

      if (dev && url.pathname === '/auth/login') {
        return handleLogin(request, {
          authName,
          privateKey: env.PRIVKEY,
          authOrigin: env.AUTH_DOMAIN,
          dev,
        })
      }

      if (url.pathname === '/auth/me') {
        return handleMe(request, {
          authName,
          privateKey: env.PRIVKEY,
          authOrigin: env.AUTH_DOMAIN,
          dev,
        })
      }

      return new Response('not found', { status: 404 })
    }

    if (
      await validateRequestFromProxy(request.headers, {
        proxyPubkey: await exportKey(publicKey),
      })
    ) {
      return new Response('infinity loop?', { status: 500 })
    }

    // ログインしてない場合はログインページに移動
    if (!(await checkLoggedIn(request, publicKey, dev))) {
      return handleLogin(request, {
        authName,
        privateKey: env.PRIVKEY,
        authOrigin: env.AUTH_DOMAIN,
        dev,
      })
    }

    const now = dayjs.tz().valueOf()
    const rand = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
    const mac = await sign(`${now}___${rand}`, privateKey)

    // それ以外の場合は Proxy
    const res = await fetch(url.toString(), {
      ...request,
      headers: {
        ...request.headers,
        'X-Maximum-Auth-Pubkey': await exportKey(publicKey),
        'X-Maximum-Auth-Time': now.toString(),
        'X-Maximum-Auth-Key': rand,
        'X-Maximum-Auth-Mac': mac,
      },
    })

    const newHeader = new Headers(res.headers)

    // Cache-control: private を付加する
    if (!res.headers.has('Cache-Control')) {
      newHeader.set('Cache-Control', 'private')
    } else {
      newHeader.set(
        'Cache-Control',
        'private, ' + res.headers.get('Cache-Control'),
      )
    }

    return new Response(res.body, {
      ...res,
      headers: newHeader,
    })
  },
}
