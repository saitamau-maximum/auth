import {
  derivePublicKey,
  exportKey,
  importKey,
  verify,
  sign,
  handleLogin,
  handleLogout,
  handleCallback,
} from '@saitamau-maximum/auth/internal'
import { parse as parseCookie } from 'cookie'

export default {
  async fetch(
    request: Request,
    env: Env,
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url)

    const authName = 'maximum-reverse-proxy'
    const privateKey = await importKey(env.PRIVKEY, 'privateKey')
    const publicKey = await derivePublicKey(privateKey)

    // Auth Routes
    if (url.pathname.startsWith('/auth/')) {
      // Callback
      if (url.pathname === '/auth/callback') {
        return handleCallback(request, {
          authName,
          privateKey: env.PRIVKEY,
          authPubkey: env.AUTH_PUBKEY,
        })
      }

      // Logout
      if (url.pathname === '/auth/logout') {
        return handleLogout(request)
      }

      return new Response('not found', { status: 404 })
    }

    if (
      request.headers.has('X-Maximum-Auth-Pubkey') ||
      request.headers.has('X-Maximum-Auth-Name') ||
      request.headers.has('X-Maximum-Auth-Key') ||
      request.headers.has('X-Maximum-Auth-Mac')
    ) {
      return new Response('infinity loop?', { status: 500 })
    }

    // ログインしてない場合はログインページに移動
    const checkLoggedIn = async () => {
      const cookie = parseCookie(request.headers.get('Cookie') || '')
      if (
        !cookie['__authdata'] ||
        !cookie['__iv'] ||
        !cookie['__sign1'] ||
        !cookie['__sign2']
      ) {
        return false
      }

      // ほんとはいつ認証したかについてもチェックすべきかもだが、
      // サブリクエスト数が多くなっても困るので簡易的にチェック
      const authdata = cookie['__authdata']
      const sig = cookie['__sign2']
      return await verify(authdata, sig, publicKey)
    }

    if (!(await checkLoggedIn())) {
      return handleLogin(request, {
        authName,
        privateKey: env.PRIVKEY,
        authOrigin: env.AUTH_DOMAIN,
      })
    }

    const rand = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
    const mac = await sign(rand, privateKey)

    // それ以外の場合は Proxy
    const res = await fetch(url.toString(), {
      ...request,
      headers: {
        ...request.headers,
        'X-Maximum-Auth-Pubkey': await exportKey(publicKey),
        'X-Maximum-Auth-Name': authName,
        'X-Maximum-Auth-Key': rand,
        'X-Maximum-Auth-Mac': mac,
      },
    })

    return res
  },
}
