import {
  getUserInfo,
  validateRequest as validateRequestFromProxy,
} from '@saitamau-maximum/auth'
import {
  derivePublicKey,
  exportKey,
  importKey,
  handleLogin,
  handleLogout,
  handleCallback,
  handleMe,
  keypairProtectedHeader,
} from '@saitamau-maximum/auth/internal'
import { SignJWT } from 'jose'

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
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
    const userData = await getUserInfo(request, {
      authName,
      privateKey: env.PRIVKEY,
      dev,
    })
    if (!userData) {
      return handleLogin(request, {
        authName,
        privateKey: env.PRIVKEY,
        authOrigin: env.AUTH_DOMAIN,
        dev,
      })
    }

    const token = await new SignJWT({})
      .setSubject('Maximum Auth Proxy')
      .setIssuer('maximum-auth-proxy')
      .setNotBefore('0 sec')
      .setIssuedAt()
      .setExpirationTime('5 sec')
      .setProtectedHeader(keypairProtectedHeader)
      .sign(privateKey)

    // それ以外の場合は Proxy
    const res = await fetch(url.toString(), {
      ...request,
      headers: {
        ...request.headers,
        'X-Maximum-Auth-Pubkey': await exportKey(publicKey),
        'X-Maximum-Auth-Token': token,
      },
    })

    const newHeader = new Headers(res.headers)

    // Cache-control: private を付加する
    newHeader.set('Cache-Control', 'private')

    return new Response(await res.text(), {
      ...res,
      headers: newHeader,
    })
  },
}
