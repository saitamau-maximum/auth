import {
  derivePublicKey,
  exportKey,
  importKey,
  verify,
  sign,
  handleLogin,
} from '@saitamau-maximum/auth/internal'
import type { CookieSerializeOptions } from 'cookie'
import { parse as parseCookie, serialize as serializeCookie } from 'cookie'

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

    const cookieOptions: CookieSerializeOptions = {
      httpOnly: true,
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    }

    // Auth Routes
    if (url.pathname.startsWith('/auth/')) {
      // Callback
      if (url.pathname === '/auth/callback') {
        const param = url.searchParams

        if (param.has('cancel')) {
          // TODO: UI しっかりする
          return new Response(
            '認証をキャンセルしました。このページにアクセスするにはログインが必要です。 <a href="/">再ログイン</a><a href="/auth/logout">ログアウト</a>',
            { status: 401 },
          )
        }

        if (
          ['authdata', 'iv', 'signature', 'signatureIv'].some(
            key => !param.has(key) || param.getAll(key).length !== 1,
          )
        ) {
          return new Response('invalid request', { status: 400 })
        }

        const authPubkey = await importKey(env.AUTH_PUBKEY, 'publicKey')
        if (
          !(await verify(
            param.get('authdata')!,
            param.get('signature')!,
            authPubkey,
          )) ||
          !(await verify(
            param.get('iv')!,
            param.get('signatureIv')!,
            authPubkey,
          ))
        ) {
          return new Response('invalid signature', { status: 400 })
        }

        const cookieData = request.headers.get('Cookie')
        if (!cookieData) {
          return new Response('invalid request', { status: 400 })
        }

        const continueUrl = parseCookie(cookieData)['__continue_to']

        const newHeader = new Headers(request.headers)
        newHeader.append(
          'Set-Cookie',
          serializeCookie('__continue_to', '', {
            ...cookieOptions,
            maxAge: -1,
          }),
        )
        newHeader.append(
          'Set-Cookie',
          serializeCookie('__authdata', param.get('authdata')!, cookieOptions),
        )
        newHeader.append(
          'Set-Cookie',
          serializeCookie('__iv', param.get('iv')!, cookieOptions),
        )
        newHeader.append(
          'Set-Cookie',
          serializeCookie('__sign1', param.get('signature')!, cookieOptions),
        )
        newHeader.append(
          'Set-Cookie',
          serializeCookie(
            '__sign2',
            await sign(param.get('authdata')!, privateKey),
            cookieOptions,
          ),
        )
        newHeader.set('Location', continueUrl || '/')

        return new Response(null, {
          status: 302,
          headers: newHeader,
        })
      }

      // Logout
      if (url.pathname === '/auth/logout') {
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
