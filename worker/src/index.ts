import {
  derivePublicKey,
  exportKey,
  importKey,
  generateGoParam,
  verify,
  sign,
} from '@saitamau-maximum/auth/internal'
import type { CookieSerializeOptions } from 'cookie'
import { parse as parseCookie, serialize as serializeCookie } from 'cookie'

const authDomain = 'https://auth.maximum.vc'
// const authDomain = 'http://127.0.0.1:8788'
const authPubkeyStr =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwiY3J2IjoiUC01MjEiLCJ4IjoiQUFUNVA4N3pCekFjdGcwakQ3NkNWbWNaX3NNS0hkWTJGeGZ2REwxMWxxR3hlTUZBd3REYnhpdTMwZUtkX2F3T3BjaG1relM3N2RkUmNLcEktSHdwQTQzciIsInkiOiJBTjRjcVljc0dsTDNXWTZUUXZRcklsMFExNVRDRzdTVkNVYk5kbURDUUg4dEhQZzZKTU9Cek55dFhLV1JUc3REd05qbVAzak12c3ZzdWdYelVBZ3kyNTRKIn0='

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

    // Callback
    if (url.pathname === '/auth/callback') {
      const param = url.searchParams

      if (param.has('cancel')) {
        // TODO: UI しっかりする
        return new Response(
          '認証をキャンセルしました。このページにアクセスするにはログインが必要です。',
          { status: 401 },
        )
      }

      if (
        !param.has('authdata') ||
        !param.has('iv') ||
        !param.has('signature') ||
        !param.has('signatureIv') ||
        param.getAll('authdata').length !== 1 ||
        param.getAll('iv').length !== 1 ||
        param.getAll('signature').length !== 1 ||
        param.getAll('signatureIv').length !== 1
      ) {
        return new Response('invalid request', { status: 400 })
      }

      const authPubkey = await importKey(authPubkeyStr, 'publicKey')
      if (
        !(await verify(
          param.get('authdata')!,
          param.get('signature')!,
          authPubkey,
        )) ||
        !(await verify(param.get('iv')!, param.get('signatureIv')!, authPubkey))
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
      const callbackUrl = `${url.origin}/auth/callback`

      const redirectData = await fetch(`${authDomain}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: authName,
          pubkey: await exportKey(publicKey),
          callback: callbackUrl,
        }),
      }).then(res => res.json<{ token: string; iv: string }>())

      const param = await generateGoParam(
        authName,
        await exportKey(publicKey),
        callbackUrl,
        atob(redirectData.token),
        atob(redirectData.iv),
        privateKey,
      )

      return new Response(null, {
        status: 302,
        headers: {
          Location: `${authDomain}/go?${param.toString()}`,
          'Set-Cookie': serializeCookie('__continue_to', url.href, {
            ...cookieOptions,
            maxAge: 60 * 10,
          }),
        },
      })
    }

    if (url.pathname === '/hoge') {
      return new Response('hoge', { status: 200 })
    }

    // それ以外の場合は Proxy
    const res = await fetch(url.toString(), {
      ...request,
      headers: {
        ...request.headers,
        // TODO: 専用のヘッダーを追加
      },
    })

    return res
  },
}
